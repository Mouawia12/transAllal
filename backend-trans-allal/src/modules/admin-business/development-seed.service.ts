import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AppEnvironment } from '../../common/enums/app-environment.enum';
import { Role } from '../../common/enums/role.enum';
import { Driver } from './drivers/driver.entity';
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
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const appEnv =
      this.configService.get<string>('app.env') ?? AppEnvironment.Development;

    if (appEnv !== AppEnvironment.Development) {
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
    const driverPhone =
      process.env.DEV_DRIVER_PHONE ?? '0555555555';
    const driverPassword =
      process.env.DEV_DRIVER_PASSWORD ?? 'Driver123!';
    const driverFirstName =
      process.env.DEV_DRIVER_FIRST_NAME ?? 'Demo';
    const driverLastName =
      process.env.DEV_DRIVER_LAST_NAME ?? 'Driver';
    const driverLicenseNumber =
      process.env.DEV_DRIVER_LICENSE_NUMBER ?? 'DRV-DEMO-001';
    const driverLicenseExpiry =
      process.env.DEV_DRIVER_LICENSE_EXPIRY ?? '2030-12-31';

    let company = await this.companyRepo.findOne({
      where: { email: companyAdminEmail },
    });

    if (!company) {
      company = await this.companyRepo.save(
        this.companyRepo.create({
          name: companyName,
          email: companyAdminEmail,
          phone: '+213000000000',
          address: 'Development seed company',
          taxId: 'DEV-COMPANY-001',
          isActive: true,
        }),
      );
    }

    const [superAdminHash, companyAdminHash, driverHash] = await Promise.all([
      bcrypt.hash(superAdminPassword, 10),
      bcrypt.hash(companyAdminPassword, 10),
      bcrypt.hash(driverPassword, 10),
    ]);

    let superAdmin = await this.userRepo.findOne({
      where: { email: superAdminEmail },
    });
    if (!superAdmin) {
      superAdmin = await this.userRepo.save(
        this.userRepo.create({
          email: superAdminEmail,
          password: superAdminHash,
          firstName: 'Super',
          lastName: 'Admin',
          role: Role.SUPER_ADMIN,
          companyId: null,
          isActive: true,
        }),
      );
    } else {
      await this.userRepo.update(superAdmin.id, {
        password: superAdminHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: Role.SUPER_ADMIN,
        companyId: null,
        isActive: true,
      });
    }

    let companyAdmin = await this.userRepo.findOne({
      where: { email: companyAdminEmail },
    });
    if (!companyAdmin) {
      companyAdmin = await this.userRepo.save(
        this.userRepo.create({
          email: companyAdminEmail,
          password: companyAdminHash,
          firstName: 'Company',
          lastName: 'Admin',
          role: Role.COMPANY_ADMIN,
          companyId: company.id,
          isActive: true,
        }),
      );
    } else {
      await this.userRepo.update(companyAdmin.id, {
        password: companyAdminHash,
        firstName: 'Company',
        lastName: 'Admin',
        role: Role.COMPANY_ADMIN,
        companyId: company.id,
        isActive: true,
      });
    }

    let driver = await this.driverRepo.findOne({
      where: { phone: driverPhone },
      relations: ['user'],
    });

    if (!driver) {
      const driverUser = await this.userRepo.save(
        this.userRepo.create({
          email: null,
          password: driverHash,
          firstName: driverFirstName,
          lastName: driverLastName,
          role: Role.DRIVER,
          companyId: company.id,
          isActive: true,
        }),
      );

      driver = await this.driverRepo.save(
        this.driverRepo.create({
          companyId: company.id,
          userId: driverUser.id,
          firstName: driverFirstName,
          lastName: driverLastName,
          phone: driverPhone,
          licenseNumber: driverLicenseNumber,
          licenseExpiry: driverLicenseExpiry,
          isActive: true,
          isOnline: false,
        }),
      );
    } else {
      await this.userRepo.update(driver.userId, {
        password: driverHash,
        firstName: driverFirstName,
        lastName: driverLastName,
        role: Role.DRIVER,
        companyId: company.id,
        isActive: true,
      });

      await this.driverRepo.update(driver.id, {
        companyId: company.id,
        firstName: driverFirstName,
        lastName: driverLastName,
        phone: driverPhone,
        licenseNumber: driverLicenseNumber,
        licenseExpiry: driverLicenseExpiry,
        isActive: true,
      });
    }

    this.logger.log(
      [
        'Development seed ready.',
        `SUPER_ADMIN: ${superAdminEmail} / ${superAdminPassword}`,
        `COMPANY_ADMIN: ${companyAdminEmail} / ${companyAdminPassword}`,
        `DRIVER: ${driverPhone} / ${driverPassword}`,
        `COMPANY_ID: ${company.id}`,
      ].join(' '),
    );
  }
}
