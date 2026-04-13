import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../drivers/driver.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';
import { Alert } from '../../telemetry/alerts/alert.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, Driver, Truck, Alert])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
