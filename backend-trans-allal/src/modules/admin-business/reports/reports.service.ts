import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Not, Repository } from 'typeorm';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { Alert } from '../../telemetry/alerts/alert.entity';
import { Driver } from '../drivers/driver.entity';
import { Trip } from '../trips/trip.entity';
import { Truck } from '../trucks/truck.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Truck) private readonly truckRepo: Repository<Truck>,
    @InjectRepository(Alert) private readonly alertRepo: Repository<Alert>,
  ) {}

  async getSummary(companyId: string) {
    const [
      totalTrips,
      completedTrips,
      activeTrips,
      pendingTrips,
      activeDrivers,
      activeTrucks,
    ] = await Promise.all([
      this.tripRepo.count({
        where: { companyId, status: Not(TripStatus.CANCELLED) },
      }),
      this.tripRepo.count({
        where: { companyId, status: TripStatus.COMPLETED },
      }),
      this.tripRepo.count({
        where: { companyId, status: TripStatus.IN_PROGRESS },
      }),
      this.tripRepo.count({
        where: { companyId, status: TripStatus.PENDING },
      }),
      this.driverRepo.count({ where: { companyId, isActive: true } }),
      this.truckRepo.count({ where: { companyId, isActive: true } }),
    ]);

    return {
      totalTrips,
      completedTrips,
      activeTrips,
      pendingTrips,
      activeDrivers,
      activeTrucks,
    };
  }

  async getTripsReport(
    companyId: string,
    from: string,
    to: string,
    groupBy: 'day' | 'week',
  ) {
    const trips = await this.tripRepo.find({
      where: {
        companyId,
        scheduledAt: Between(new Date(from), new Date(to)),
      },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
      },
      order: { scheduledAt: 'ASC' },
    });

    const grouped = new Map<
      string,
      { period: string; total: number; completed: number; cancelled: number }
    >();

    for (const trip of trips) {
      const period = this.normalizePeriod(trip.scheduledAt, groupBy);
      const bucket = grouped.get(period) ?? {
        period,
        total: 0,
        completed: 0,
        cancelled: 0,
      };
      bucket.total += 1;
      if (trip.status === TripStatus.COMPLETED) bucket.completed += 1;
      if (trip.status === TripStatus.CANCELLED) bucket.cancelled += 1;
      grouped.set(period, bucket);
    }

    return Array.from(grouped.values()).sort((left, right) =>
      left.period.localeCompare(right.period),
    );
  }

  async getDriversReport(companyId: string, from: string, to: string) {
    const [drivers, trips] = await Promise.all([
      this.driverRepo.find({
        where: { companyId, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      }),
      this.tripRepo.find({
        where: {
          companyId,
          scheduledAt: Between(new Date(from), new Date(to)),
        },
        select: {
          id: true,
          driverId: true,
          status: true,
        },
      }),
    ]);

    const stats = new Map<
      string,
      {
        id: string;
        firstName: string;
        lastName: string;
        totalTrips: number;
        completedTrips: number;
      }
    >();

    for (const driver of drivers) {
      stats.set(driver.id, {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        totalTrips: 0,
        completedTrips: 0,
      });
    }

    for (const trip of trips) {
      if (!trip.driverId) {
        continue;
      }

      const driver = stats.get(trip.driverId);
      if (!driver) {
        continue;
      }

      driver.totalTrips += 1;
      if (trip.status === TripStatus.COMPLETED) {
        driver.completedTrips += 1;
      }
    }

    return Array.from(stats.values()).sort((left, right) => {
      if (right.completedTrips !== left.completedTrips) {
        return right.completedTrips - left.completedTrips;
      }

      if (right.totalTrips !== left.totalTrips) {
        return right.totalTrips - left.totalTrips;
      }

      return `${left.firstName} ${left.lastName}`.localeCompare(
        `${right.firstName} ${right.lastName}`,
      );
    });
  }

  async getAlertsReport(companyId: string, from: string, to: string) {
    const alerts = await this.alertRepo.find({
      where: {
        companyId,
        createdAt: Between(new Date(from), new Date(to)),
      },
      select: {
        type: true,
        severity: true,
      },
    });

    const grouped = new Map<
      string,
      { type: string; severity: string; total: number }
    >();
    for (const alert of alerts) {
      const key = `${alert.type}:${alert.severity}`;
      const bucket = grouped.get(key) ?? {
        type: alert.type,
        severity: alert.severity,
        total: 0,
      };
      bucket.total += 1;
      grouped.set(key, bucket);
    }

    return Array.from(grouped.values()).sort(
      (left, right) => right.total - left.total,
    );
  }

  private normalizePeriod(date: Date, groupBy: 'day' | 'week'): string {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);

    if (groupBy === 'week') {
      const day = normalized.getUTCDay();
      const offset = day === 0 ? -6 : 1 - day;
      normalized.setUTCDate(normalized.getUTCDate() + offset);
    }

    return normalized.toISOString();
  }
}
