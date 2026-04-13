import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { Driver } from '../admin-business/drivers/driver.entity';
import { User } from '../admin-business/users/user.entity';
import { RefreshToken } from './refresh-token.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtPayload {
  sub: string;
  role: Role;
  companyId: string | null;
  driverId: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(RefreshToken) private readonly tokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async loginUser(email: string, password: string): Promise<TokenPair & { user: Omit<User, 'password'> }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail, isActive: true },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'companyId', 'isActive'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    const payload = this.buildPayload(user, null);
    const tokens = await this.generateTokenPair(payload, user.id);
    const { password: _pw, ...safeUser } = user;
    return { ...tokens, user: safeUser };
  }

  async loginDriver(phone: string, password: string): Promise<TokenPair & { user: Omit<User, 'password'>; driver: Driver }> {
    const normalizedPhone = phone.trim();
    const driver = await this.driverRepo.findOne({
      where: { phone: normalizedPhone, isActive: true },
      relations: ['user'],
    });
    if (!driver) throw new UnauthorizedException('Invalid credentials');

    const user = await this.userRepo.findOne({
      where: { id: driver.userId },
      select: ['id', 'email', 'password', 'firstName', 'lastName', 'role', 'companyId', 'isActive'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    const payload = this.buildPayload(user, driver.id);
    const tokens = await this.generateTokenPair(payload, user.id);
    const { password: _pw, ...safeUser } = user;
    return { ...tokens, user: safeUser, driver };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const hash = this.hashToken(refreshToken);
    const record = await this.tokenRepo.findOne({
      where: { tokenHash: hash },
      relations: ['user'],
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.tokenRepo.update(record.id, { revokedAt: new Date() });
    const driver = await this.driverRepo.findOne({ where: { userId: record.userId } });
    const payload = this.buildPayload(record.user, driver?.id ?? null);
    return this.generateTokenPair(payload, record.userId);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    await this.tokenRepo.update({ userId, tokenHash: hash }, { revokedAt: new Date() });
  }

  async getMe(userId: string): Promise<{ user: User; driver: Driver | null }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const driver = user.role === Role.DRIVER
      ? await this.driverRepo.findOne({ where: { userId } })
      : null;
    return { user, driver };
  }

  private buildPayload(user: User, driverId: string | null): JwtPayload {
    return {
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
      driverId,
    };
  }

  private async generateTokenPair(payload: JwtPayload, userId: string): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('auth.jwtSecret'),
      expiresIn: (this.config.get<string>('auth.jwtExpiresIn') ?? '15m') as unknown as number,
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('auth.jwtRefreshSecret'),
      expiresIn: (this.config.get<string>('auth.jwtRefreshExpiresIn') ?? '7d') as unknown as number,
    });

    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    await this.tokenRepo.save(
      this.tokenRepo.create({
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        revokedAt: null,
      }),
    );

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
