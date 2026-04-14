import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { Repository } from 'typeorm';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { paginatedResponse } from '../../../common/interfaces/api-response.interface';
import { Driver } from '../drivers/driver.entity';
import { Truck } from '../trucks/truck.entity';
import { DriverLocation } from '../../telemetry/tracking/driver-location.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Trip } from './trip.entity';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private readonly repo: Repository<Trip>,
    @InjectRepository(DriverLocation)
    private readonly locationRepo: Repository<DriverLocation>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Truck) private readonly truckRepo: Repository<Truck>,
  ) {}

  async findAll(query: QueryTripDto) {
    const { page, limit, companyId, driverId, status, from, to } = query;
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.driver', 'driver')
      .leftJoinAndSelect('t.truck', 'truck');
    if (companyId) qb.andWhere('t.companyId = :companyId', { companyId });
    if (driverId) qb.andWhere('t.driverId = :driverId', { driverId });
    if (status) qb.andWhere('t.status = :status', { status });
    if (from) qb.andWhere('t.scheduledAt >= :from', { from });
    if (to) qb.andWhere('t.scheduledAt <= :to', { to });
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('t.scheduledAt', 'DESC')
      .getManyAndCount();
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(
    id: string,
    scope: { companyId?: string; driverId?: string } = {},
  ): Promise<Trip> {
    const where: FindOptionsWhere<Trip> = { id };
    if (scope.companyId) {
      where.companyId = scope.companyId;
    }
    if (scope.driverId) {
      where.driverId = scope.driverId;
    }

    const trip = await this.repo.findOne({
      where,
      relations: ['driver', 'truck', 'company'],
    });
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);
    return trip;
  }

  async getMyTrips(driverId: string) {
    const [data, total] = await this.repo.findAndCount({
      where: { driverId },
      relations: ['truck'],
      order: { scheduledAt: 'DESC' },
    });
    return paginatedResponse(data, total, 1, Math.max(data.length, 1));
  }

  async create(dto: CreateTripDto): Promise<Trip> {
    if (dto.driverId) {
      const driver = await this.driverRepo.findOne({
        where: { id: dto.driverId, companyId: dto.companyId },
      });
      if (!driver) {
        throw new BadRequestException(
          'Selected driver does not belong to the target company',
        );
      }
    }

    if (dto.truckId) {
      const truck = await this.truckRepo.findOne({
        where: { id: dto.truckId, companyId: dto.companyId },
      });
      if (!truck) {
        throw new BadRequestException(
          'Selected truck does not belong to the target company',
        );
      }
    }

    return this.repo.save(
      this.repo.create({ ...dto, status: TripStatus.PENDING }),
    );
  }

  async update(
    id: string,
    dto: UpdateTripDto,
    companyId?: string,
  ): Promise<Trip> {
    const trip = await this.findOne(id, { companyId });
    if (
      dto.status === TripStatus.IN_PROGRESS &&
      trip.status === TripStatus.PENDING
    ) {
      trip.startedAt = new Date();
    }
    if (
      dto.status === TripStatus.COMPLETED &&
      trip.status === TripStatus.IN_PROGRESS
    ) {
      trip.completedAt = new Date();
    }
    Object.assign(trip, dto);
    return this.repo.save(trip);
  }

  async updateStatusForDriver(
    driverId: string,
    tripId: string,
    status: TripStatus.IN_PROGRESS | TripStatus.COMPLETED,
  ): Promise<Trip> {
    const trip = await this.findOne(tripId, { driverId });

    if (status === TripStatus.IN_PROGRESS) {
      if (trip.status !== TripStatus.PENDING) {
        throw new BadRequestException(
          'Trip can only be started from PENDING status',
        );
      }
      trip.status = TripStatus.IN_PROGRESS;
      trip.startedAt = new Date();
      return this.repo.save(trip);
    }

    if (trip.status !== TripStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Trip can only be completed from IN_PROGRESS status',
      );
    }

    trip.status = TripStatus.COMPLETED;
    trip.completedAt = new Date();
    return this.repo.save(trip);
  }

  async cancel(id: string, companyId?: string): Promise<Trip> {
    return this.update(id, { status: TripStatus.CANCELLED }, companyId);
  }

  async getTrackHistory(tripId: string, companyId?: string) {
    await this.findOne(tripId, { companyId });
    return this.locationRepo.find({
      where: { tripId },
      order: { recordedAt: 'ASC' },
    });
  }
}
