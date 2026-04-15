import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../drivers/driver.entity';
import { Truck } from '../trucks/truck.entity';
import { DriverLocation } from '../../telemetry/tracking/driver-location.entity';
import { PushNotificationService } from '../../notifications/push-notification.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { Trip } from './trip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, DriverLocation, Driver, Truck])],
  controllers: [TripsController],
  providers: [TripsService, PushNotificationService],
  exports: [TripsService],
})
export class TripsModule {}
