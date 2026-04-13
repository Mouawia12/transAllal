import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppEnvironment } from '../../common/enums/app-environment.enum';
import { Role } from '../../common/enums/role.enum';
import { Company } from './companies/company.entity';
import { User } from './users/user.entity';

@Injectable()
export class DevelopmentSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DevelopmentSeedService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const appEnv =
      this.configService.get<string>('app.env') ?? AppEnvironment.Development;

    if (appEnv !== AppEnvironment.Development) {
      return;
    }

    const usersCount = await this.userRepo.count();
    if (usersCount > 0) {
      return;
    }

    const companyName =
      process.env.DEV_COMPANY_NAME ?? 'Trans Allal Demo Logistics';
    const superAdminEmail =
      process.env.DEV_SUPER_ADMIN_EMAIL ?? 'superadmin@transallal.local';
    const superAdminPassword =
      process.env.DEV_SUPER_ADMIN_PASSWORD ?? 'SuperAdmin123!';
    const companyAdminEmail =
      process.env.DEV_COMPANY_ADMIN_EMAIL ?? 'admin@transallal.local';
    const companyAdminPassword =
      process.env.DEV_COMPANY_ADMIN_PASSWORD ?? 'CompanyAdmin123!';

    const company = await this.companyRepo.save(
      this.companyRepo.create({
        name: companyName,
        email: companyAdminEmail,
        phone: '+213000000000',
        address: 'Development seed company',
        taxId: 'DEV-COMPANY-001',
        isActive: true,
      }),
    );

    const [superAdminHash, companyAdminHash] = await Promise.all([
      bcrypt.hash(superAdminPassword, 10),
      bcrypt.hash(companyAdminPassword, 10),
    ]);

    await this.userRepo.save([
      this.userRepo.create({
        email: superAdminEmail,
        password: superAdminHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: Role.SUPER_ADMIN,
        companyId: null,
        isActive: true,
      }),
      this.userRepo.create({
        email: companyAdminEmail,
        password: companyAdminHash,
        firstName: 'Company',
        lastName: 'Admin',
        role: Role.COMPANY_ADMIN,
        companyId: company.id,
        isActive: true,
      }),
    ]);

    this.logger.log(
      [
        'Development seed completed.',
        `SUPER_ADMIN: ${superAdminEmail} / ${superAdminPassword}`,
        `COMPANY_ADMIN: ${companyAdminEmail} / ${companyAdminPassword}`,
        `COMPANY_ID: ${company.id}`,
      ].join(' '),
    );
  }
}
