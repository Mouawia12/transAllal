import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { DriversModule } from './drivers/drivers.module';
import { ReportsModule } from './reports/reports.module';
import { TripsModule } from './trips/trips.module';
import { TrucksModule } from './trucks/trucks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    UsersModule,
    CompaniesModule,
    DriversModule,
    TrucksModule,
    TripsModule,
    ReportsModule,
  ],
})
export class AdminBusinessModule {}
