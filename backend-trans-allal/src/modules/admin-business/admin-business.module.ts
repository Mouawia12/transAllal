import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './companies/company.entity';
import { CompaniesModule } from './companies/companies.module';
import { DevelopmentSeedService } from './development-seed.service';
import { DriversModule } from './drivers/drivers.module';
import { ReportsModule } from './reports/reports.module';
import { TripsModule } from './trips/trips.module';
import { TrucksModule } from './trucks/trucks.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, User]),
    UsersModule,
    CompaniesModule,
    DriversModule,
    TrucksModule,
    TripsModule,
    ReportsModule,
  ],
  providers: [DevelopmentSeedService],
})
export class AdminBusinessModule {}
