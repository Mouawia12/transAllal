import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { paginatedResponse } from '../../../common/interfaces/api-response.interface';
import { DriverLocation } from '../../telemetry/tracking/driver-location.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Trip } from './trip.entity';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip) private readonly repo: Repository<Trip>,
    @InjectRepository(DriverLocation) private readonly locationRepo: Repository<DriverLocation>,
  ) {}

  async findAll(query: QueryTripDto) {
    const { page, limit, companyId, driverId, status, from, to } = query;
    const qb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.driver', 'driver')
      .leftJoinAndSelect('t.truck', 'truck');
    if (companyId) qb.andWhere('t.companyId = :companyId', { companyId });
    if (driverId) qb.andWhere('t.driverId = :driverId', { driverId });
    if (status) qb.andWhere('t.status = :status', { status });
    if (from) qb.andWhere('t.scheduledAt >= :from', { from });
    if (to) qb.andWhere('t.scheduledAt <= :to', { to });
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).orderBy('t.scheduledAt', 'DESC').getManyAndCount();
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<Trip> {
    const trip = await this.repo.findOne({ where: { id }, relations: ['driver', 'truck', 'company'] });
    if (!trip) throw new NotFoundException(`Trip ${id} not found`);
    return trip;
  }

  async getMyTrips(driverId: string) {
    const [data, total] = await this.repo.findAndCount({
      where: { driverId },
      relations: ['truck'],
      order: { scheduledAt: 'DESC' },
    });
    return paginatedResponse(data, total, 1, data.length);
  }

  async create(dto: CreateTripDto): Promise<Trip> {
    return this.repo.save(this.repo.create({ ...dto, status: TripStatus.PENDING }));
  }

  async update(id: string, dto: UpdateTripDto): Promise<Trip> {
    const trip = await this.findOne(id);
    if (dto.status === TripStatus.IN_PROGRESS && trip.status === TripStatus.PENDING) {
      trip.startedAt = new Date();
    }
    if (dto.status === TripStatus.COMPLETED && trip.status === TripStatus.IN_PROGRESS) {
      trip.completedAt = new Date();
    }
    Object.assign(trip, dto);
    return this.repo.save(trip);
  }

  async updateStatusForDriver(driverId: string, tripId: string, status: TripStatus.IN_PROGRESS | TripStatus.COMPLETED): Promise<Trip> {
    const trip = await this.findOne(tripId);
    if (trip.driverId !== driverId) throw new BadRequestException('Not authorized for this trip');
    return this.update(tripId, { status });
  }

  async cancel(id: string): Promise<Trip> {
    return this.update(id, { status: TripStatus.CANCELLED });
  }

  async getTrackHistory(tripId: string) {
    await this.findOne(tripId);
    return this.locationRepo.find({ where: { tripId }, order: { recordedAt: 'ASC' } });
  }
}
