import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../admin-business/drivers/driver.entity';
import { AlertType, Severity } from '../../../common/enums/alert.enum';
import { AlertsService } from '../alerts/alerts.service';
import { DriverLocation } from './driver-location.entity';
import { SaveLocationDto } from './dto/save-location.dto';

const SPEEDING_THRESHOLD_KMH = 120;

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(DriverLocation) private readonly locationRepo: Repository<DriverLocation>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @Inject(forwardRef(() => AlertsService)) private readonly alertsService: AlertsService,
  ) {}

  async saveLocation(driverId: string, companyId: string, dto: SaveLocationDto): Promise<DriverLocation> {
    const location = await this.locationRepo.save(
      this.locationRepo.create({
        driverId,
        tripId: dto.tripId ?? null,
        lat: dto.lat,
        lng: dto.lng,
        speedKmh: dto.speedKmh ?? null,
        heading: dto.heading ?? null,
        accuracyM: dto.accuracyM ?? null,
        recordedAt: new Date(),
      }),
    );

    await this.driverRepo.update(driverId, { lastSeenAt: new Date() });

    if (dto.speedKmh && dto.speedKmh > SPEEDING_THRESHOLD_KMH) {
      await this.alertsService.create({
        companyId,
        driverId,
        tripId: dto.tripId,
        type: AlertType.SPEEDING,
        severity: Severity.HIGH,
        message: `Driver exceeded speed limit: ${dto.speedKmh} km/h`,
      });
    }

    return location;
  }

  async startSession(driverId: string): Promise<void> {
    await this.driverRepo.update(driverId, { isOnline: true, lastSeenAt: new Date() });
  }

  async stopSession(driverId: string): Promise<void> {
    await this.driverRepo.update(driverId, { isOnline: false });
  }

  async getLiveLocations(companyId: string): Promise<unknown[]> {
    return this.locationRepo.query(
      `SELECT DISTINCT ON (dl.driver_id)
        dl.driver_id as "driverId", dl.trip_id as "tripId",
        dl.lat, dl.lng, dl.speed_kmh as "speedKmh", dl.heading, dl.accuracy_m as "accuracyM", dl.recorded_at as "recordedAt",
        d.first_name as "firstName", d.last_name as "lastName", d.is_online as "isOnline", d.last_seen_at as "lastSeenAt"
       FROM driver_locations dl
       JOIN drivers d ON d.id = dl.driver_id
       WHERE d.company_id = $1 AND d.is_online = true AND d.is_active = true
       ORDER BY dl.driver_id, dl.recorded_at DESC`,
      [companyId],
    );
  }

  async getAllTruckPositions(companyId: string): Promise<unknown[]> {
    return this.locationRepo.query(
      `SELECT DISTINCT ON (dl.driver_id)
        dl.driver_id as "driverId", dl.trip_id as "tripId",
        dl.lat, dl.lng, dl.speed_kmh as "speedKmh", dl.heading, dl.recorded_at as "recordedAt",
        d.first_name as "firstName", d.last_name as "lastName", d.is_online as "isOnline", d.last_seen_at as "lastSeenAt"
       FROM driver_locations dl
       JOIN drivers d ON d.id = dl.driver_id
       WHERE d.company_id = $1 AND d.is_active = true
       ORDER BY dl.driver_id, dl.recorded_at DESC`,
      [companyId],
    );
  }

  async getHistory(driverId: string, from: string, to: string): Promise<DriverLocation[]> {
    return this.locationRepo.createQueryBuilder('dl')
      .where('dl.driverId = :driverId', { driverId })
      .andWhere('dl.recordedAt BETWEEN :from AND :to', { from, to })
      .orderBy('dl.recordedAt', 'ASC')
      .getMany();
  }
}
