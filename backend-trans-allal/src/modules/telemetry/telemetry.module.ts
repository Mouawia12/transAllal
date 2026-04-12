import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { TrackingModule } from './tracking/tracking.module';

@Module({
  imports: [TrackingModule, AlertsModule],
})
export class TelemetryModule {}
