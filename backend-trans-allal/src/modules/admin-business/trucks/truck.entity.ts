import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../companies/company.entity';

const numericColumnTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => {
    if (value === null) {
      return null;
    }

    const parsedValue =
      typeof value === 'number' ? value : Number.parseFloat(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  },
};

@Entity('trucks')
export class Truck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ name: 'plate_number', length: 30, unique: true })
  plateNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ type: 'smallint', nullable: true })
  year: number | null;

  @Column({
    name: 'capacity_tons',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: numericColumnTransformer,
  })
  capacityTons: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
