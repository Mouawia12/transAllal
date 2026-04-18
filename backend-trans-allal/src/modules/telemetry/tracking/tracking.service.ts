import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../admin-business/drivers/driver.entity';
import { AlertType, Severity } from '../../../common/enums/alert.enum';
import { AlertsService } from '../alerts/alerts.service';
import { DriverLocation } from './driver-location.entity';
import { SaveLocationDto } from './dto/save-location.dto';
import { WebsocketService } from '../../../websocket/websocket.service';

const SPEEDING_THRESHOLD_KMH = 120;
const TRACKING_SESSION_INACTIVE_ERROR = 'TRACKING_SESSION_INACTIVE';

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(DriverLocation)
    private readonly locationRepo: Repository<DriverLocation>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @Inject(forwardRef(() => AlertsService))
    private readonly alertsService: AlertsService,
    private readonly websocketService: WebsocketService,
  ) {}

  async saveLocation(
    driverId: string,
    companyId: string,
    dto: SaveLocationDto,
  ): Promise<DriverLocation> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver || driver.companyId !== companyId) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    if (!driver.isOnline || !driver.sessionStartedAt) {
      this.websocketService.emitDriverSessionStopped({
        driverId,
        companyId: driver.companyId,
        reason: 'SESSION_INACTIVE',
      });
      throw new ConflictException({
        message: 'Tracking session is inactive for this driver',
        error: TRACKING_SESSION_INACTIVE_ERROR,
        details: {
          action: 'stop_tracking',
          driverId,
        },
      });
    }

    const location = await this.locationRepo.save(
      this.locationRepo.create({
        driverId,
        tripId: dto.tripId ?? null,
        lat: dto.lat,
        lng: dto.lng,
        speedKmh: dto.speedKmh ?? null,
        heading: dto.heading ?? null,
        accuracyM: dto.accuracyM ?? null,
        batteryLevel: dto.batteryLevel ?? null,
        recordedAt: new Date(),
      }),
    );

    const driverUpdate: Partial<Driver> = { lastSeenAt: new Date() };
    if (dto.batteryLevel !== undefined) {
      driverUpdate.batteryLevel = dto.batteryLevel;
    }
    await this.driverRepo.update(driverId, driverUpdate);

    this.websocketService.emitDriverLocation({
      companyId: driver.companyId,
      driverId,
      tripId: location.tripId,
      lat: Number(location.lat),
      lng: Number(location.lng),
      speedKmh: location.speedKmh === null ? null : Number(location.speedKmh),
      heading: location.heading,
      accuracyM:
        location.accuracyM === null ? null : Number(location.accuracyM),
      batteryLevel:
        location.batteryLevel === null ? null : Number(location.batteryLevel),
      recordedAt: location.recordedAt,
    });

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
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    const sessionStartedAt = new Date();
    await this.driverRepo.update(driverId, {
      isOnline: true,
      lastSeenAt: sessionStartedAt,
      sessionStartedAt,
    });
    this.websocketService.emitOnlineChanged(
      driverId,
      driver.companyId,
      true,
      sessionStartedAt,
      sessionStartedAt,
      `${driver.firstName} ${driver.lastName}`.trim(),
    );
  }

  async stopSession(driverId: string): Promise<void> {
    await this.stopSessionInternal(driverId);
  }

  async forceStopSession(driverId: string, companyId?: string): Promise<void> {
    await this.stopSessionInternal(driverId, {
      companyId,
      notifyDriver: true,
      reason: 'DASHBOARD',
    });
  }

  private async stopSessionInternal(
    driverId: string,
    options?: {
      companyId?: string;
      notifyDriver?: boolean;
      reason?: 'DASHBOARD' | 'SESSION_INACTIVE';
    },
  ): Promise<void> {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    if (options?.companyId && driver.companyId !== options.companyId) {
      throw new NotFoundException(`Driver ${driverId} not found`);
    }

    await this.driverRepo.update(driverId, {
      isOnline: false,
      sessionStartedAt: null,
    });
    this.websocketService.emitOnlineChanged(
      driverId,
      driver.companyId,
      false,
      driver.lastSeenAt,
      null,
      `${driver.firstName} ${driver.lastName}`.trim(),
    );

    if (options?.notifyDriver) {
      this.websocketService.emitDriverSessionStopped({
        driverId,
        companyId: driver.companyId,
        reason: options.reason ?? 'DASHBOARD',
      });
    }
  }

  async getLiveLocations(companyId: string): Promise<unknown[]> {
    return this.buildLatestLocationsQuery(companyId, true).getRawMany();
  }

  async getAllTruckPositions(companyId: string): Promise<unknown[]> {
    return this.buildLatestLocationsQuery(companyId, false).getRawMany();
  }

  async getHistory(
    driverId: string,
    from: string,
    to: string,
    companyId?: string,
  ): Promise<DriverLocation[]> {
    if (companyId) {
      const isAllowed = await this.belongsToCompany(driverId, companyId);
      if (!isAllowed) {
        throw new NotFoundException(`Driver ${driverId} not found`);
      }
    }

    return this.locationRepo
      .createQueryBuilder('dl')
      .where('dl.driverId = :driverId', { driverId })
      .andWhere('dl.recordedAt BETWEEN :from AND :to', { from, to })
      .orderBy('dl.recordedAt', 'ASC')
      .getMany();
  }

  async belongsToCompany(
    driverId: string,
    companyId: string,
  ): Promise<boolean> {
    return this.driverRepo.exists({ where: { id: driverId, companyId } });
  }

  private buildLatestLocationsQuery(companyId: string, onlyOnline: boolean) {
    // Start from Driver so ALL active drivers appear, even those without a
    // location record yet. Location data is LEFT JOINed on the latest row.
    const qb = this.driverRepo
      .createQueryBuilder('driver')
      .leftJoin(
        (subQuery) =>
          subQuery
            .select('dl.driverId', 'driverId')
            .addSelect('dl.tripId', 'tripId')
            .addSelect('dl.lat', 'lat')
            .addSelect('dl.lng', 'lng')
            .addSelect('dl.speedKmh', 'speedKmh')
            .addSelect('dl.heading', 'heading')
            .addSelect('dl.accuracyM', 'accuracyM')
            .addSelect('dl.batteryLevel', 'batteryLevel')
            .addSelect('dl.recordedAt', 'recordedAt')
            .from(DriverLocation, 'dl')
            .innerJoin(
              (inner) =>
                inner
                  .select('innerDl.driverId', 'driverId')
                  .addSelect('MAX(innerDl.recordedAt)', 'maxAt')
                  .from(DriverLocation, 'innerDl')
                  .groupBy('innerDl.driverId'),
              'latest',
              'latest.driverId = dl.driverId AND dl.recordedAt = latest.maxAt',
            ),
        'location',
        'location.driverId = driver.id',
      )
      .select('driver.id', 'driverId')
      .addSelect('driver.firstName', 'firstName')
      .addSelect('driver.lastName', 'lastName')
      .addSelect('driver.isOnline', 'isOnline')
      .addSelect('driver.lastSeenAt', 'lastSeenAt')
      .addSelect('driver.sessionStartedAt', 'sessionStartedAt')
      .addSelect('driver.batteryLevel', 'batteryLevel')
      .addSelect('location.tripId', 'tripId')
      .addSelect('location.lat', 'lat')
      .addSelect('location.lng', 'lng')
      .addSelect('location.speedKmh', 'speedKmh')
      .addSelect('location.heading', 'heading')
      .addSelect('location.accuracyM', 'accuracyM')
      .addSelect('location.recordedAt', 'recordedAt')
      .where('driver.companyId = :companyId', { companyId })
      .andWhere('driver.isActive = true');

    if (onlyOnline) {
      qb.andWhere('driver.isOnline = true');
    }

    return qb.orderBy('driver.lastSeenAt', 'DESC');
  }
}
