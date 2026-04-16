import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Driver } from '../../admin-business/drivers/driver.entity';
import { Trip } from '../../admin-business/trips/trip.entity';

// Composite indexes tuned for the two primary telemetry query patterns:
//   1. Latest-location lookup:  WHERE driver_id = ? ORDER BY recorded_at DESC LIMIT 1
//   2. Tracking history:        WHERE driver_id = ? AND recorded_at BETWEEN ? AND ?
//   3. Trip replay:             WHERE trip_id = ? ORDER BY recorded_at ASC
@Index('idx_driver_locations_driver_recorded', ['driverId', 'recordedAt'])
@Index('idx_driver_locations_trip_recorded', ['tripId', 'recordedAt'])
@Entity('driver_locations')
export class DriverLocation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'driver_id' })
  driverId: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ name: 'trip_id', type: 'char', length: 36, nullable: true })
  tripId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip | null;

  @Column({ type: 'numeric', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'numeric', precision: 10, scale: 7 })
  lng: number;

  @Column({
    name: 'speed_kmh',
    type: 'numeric',
    precision: 5,
    scale: 1,
    nullable: true,
  })
  speedKmh: number | null;

  @Column({ type: 'smallint', nullable: true })
  heading: number | null;

  @Column({
    name: 'accuracy_m',
    type: 'numeric',
    precision: 6,
    scale: 1,
    nullable: true,
  })
  accuracyM: number | null;

  @Column({
    name: 'battery_level',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  batteryLevel: number | null;

  @Column({
    name: 'recorded_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  recordedAt: Date;
}
