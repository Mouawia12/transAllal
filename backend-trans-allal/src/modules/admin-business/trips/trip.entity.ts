import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { Company } from '../companies/company.entity';
import { Driver } from '../drivers/driver.entity';
import { Truck } from '../trucks/truck.entity';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'driver_id', type: 'char', length: 36, nullable: true })
  driverId: string | null;

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver | null;

  @Column({ name: 'truck_id', type: 'char', length: 36, nullable: true })
  truckId: string | null;

  @ManyToOne(() => Truck, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'truck_id' })
  truck: Truck | null;

  @Column({ length: 255 })
  origin: string;

  @Column({ length: 255 })
  destination: string;

  @Column({
    name: 'origin_lat',
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  originLat: number | null;

  @Column({
    name: 'origin_lng',
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  originLng: number | null;

  @Column({
    name: 'destination_lat',
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  destinationLat: number | null;

  @Column({
    name: 'destination_lng',
    type: 'numeric',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  destinationLng: number | null;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 30, default: TripStatus.PENDING })
  status: TripStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
