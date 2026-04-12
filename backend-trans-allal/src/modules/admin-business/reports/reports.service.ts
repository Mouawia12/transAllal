import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getSummary(companyId: string) {
    const [trips] = await this.dataSource.query(
      `SELECT
        COUNT(*) FILTER (WHERE status != 'CANCELLED') as total_trips,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_trips,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as active_trips,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_trips
       FROM trips WHERE company_id = $1`, [companyId]);
    const [drivers] = await this.dataSource.query(
      `SELECT COUNT(*) as active_drivers FROM drivers WHERE company_id = $1 AND is_active = true`, [companyId]);
    const [trucks] = await this.dataSource.query(
      `SELECT COUNT(*) as active_trucks FROM trucks WHERE company_id = $1 AND is_active = true`, [companyId]);
    return { ...trips, ...drivers, ...trucks };
  }

  async getTripsReport(companyId: string, from: string, to: string, groupBy: 'day' | 'week') {
    const trunc = groupBy === 'week' ? 'week' : 'day';
    return this.dataSource.query(
      `SELECT DATE_TRUNC('${trunc}', scheduled_at) as period, COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled
       FROM trips
       WHERE company_id = $1 AND scheduled_at BETWEEN $2 AND $3
       GROUP BY period ORDER BY period ASC`,
      [companyId, from, to],
    );
  }

  async getDriversReport(companyId: string, from: string, to: string) {
    return this.dataSource.query(
      `SELECT d.id, d.first_name, d.last_name,
        COUNT(t.id) as total_trips,
        COUNT(t.id) FILTER (WHERE t.status = 'COMPLETED') as completed_trips
       FROM drivers d
       LEFT JOIN trips t ON t.driver_id = d.id AND t.scheduled_at BETWEEN $2 AND $3
       WHERE d.company_id = $1 AND d.is_active = true
       GROUP BY d.id ORDER BY completed_trips DESC`,
      [companyId, from, to],
    );
  }

  async getAlertsReport(companyId: string, from: string, to: string) {
    return this.dataSource.query(
      `SELECT type, severity, COUNT(*) as total
       FROM alerts
       WHERE company_id = $1 AND created_at BETWEEN $2 AND $3
       GROUP BY type, severity ORDER BY total DESC`,
      [companyId, from, to],
    );
  }
}
