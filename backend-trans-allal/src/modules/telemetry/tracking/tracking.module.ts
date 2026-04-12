import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../../admin-business/drivers/driver.entity';
import { AlertsModule } from '../alerts/alerts.module';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { DriverLocation } from './driver-location.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverLocation, Driver]),
    forwardRef(() => AlertsModule),
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}
