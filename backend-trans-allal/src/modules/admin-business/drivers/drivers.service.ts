import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../../../common/enums/role.enum';
import { paginatedResponse } from '../../../common/interfaces/api-response.interface';
import { User } from '../users/user.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { QueryDriverDto } from './dto/query-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Driver } from './driver.entity';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private readonly repo: Repository<Driver>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async findAll(query: QueryDriverDto) {
    const { page, limit, companyId, isActive, search } = query;
    const qb = this.repo.createQueryBuilder('d').leftJoinAndSelect('d.company', 'company');
    if (companyId) qb.andWhere('d.companyId = :companyId', { companyId });
    if (isActive !== undefined) qb.andWhere('d.isActive = :isActive', { isActive });
    if (search) qb.andWhere('(d.firstName ILIKE :s OR d.lastName ILIKE :s OR d.phone ILIKE :s)', { s: `%${search}%` });
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).orderBy('d.createdAt', 'DESC').getManyAndCount();
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<Driver> {
    const driver = await this.repo.findOne({ where: { id }, relations: ['company'] });
    if (!driver) throw new NotFoundException(`Driver ${id} not found`);
    return driver;
  }

  async create(dto: CreateDriverDto): Promise<{ driver: Driver; temporaryPassword?: string }> {
    const rawPassword = dto.initialPassword ?? this.generatePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await this.userRepo.save(
      this.userRepo.create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: null,
        password: hashedPassword,
        role: Role.DRIVER,
        companyId: dto.companyId,
        isActive: true,
      }),
    );

    const driver = await this.repo.save(
      this.repo.create({
        companyId: dto.companyId,
        userId: user.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        licenseNumber: dto.licenseNumber,
        licenseExpiry: dto.licenseExpiry,
      }),
    );

    return { driver, temporaryPassword: dto.initialPassword ? undefined : rawPassword };
  }

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    const driver = await this.findOne(id);
    Object.assign(driver, dto);
    await this.repo.save(driver);
    if (dto.firstName || dto.lastName || dto.isActive !== undefined) {
      await this.userRepo.update(driver.userId, {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      });
    }
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<void> {
    const driver = await this.findOne(id);
    await this.repo.update(id, { isActive: false });
    await this.userRepo.update(driver.userId, { isActive: false });
  }

  private generatePassword(): string {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
  }
}
