import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AlertType, Severity } from '../../../common/enums/alert.enum';
import { Company } from '../../admin-business/companies/company.entity';
import { Driver } from '../../admin-business/drivers/driver.entity';
import { Trip } from '../../admin-business/trips/trip.entity';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'driver_id', nullable: true })
  driverId: string | null;

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver | null;

  @Column({ name: 'trip_id', nullable: true })
  tripId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trip_id' })
  trip: Trip | null;

  @Column({ type: 'varchar', length: 50 })
  type: AlertType;

  @Column({ type: 'varchar', length: 20 })
  severity: Severity;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
