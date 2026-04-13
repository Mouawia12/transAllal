import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginatedResponse } from '../../../common/interfaces/api-response.interface';
import { WebsocketService } from '../../../websocket/websocket.service';
import { Alert } from './alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';
import { QueryAlertDto } from './dto/query-alert.dto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert) private readonly repo: Repository<Alert>,
    private readonly websocketService: WebsocketService,
  ) {}

  async create(dto: CreateAlertDto): Promise<Alert> {
    const alert = await this.repo.save(this.repo.create(dto));
    this.websocketService.emitAlert(alert);
    return alert;
  }

  async findAll(query: QueryAlertDto) {
    const { page, limit, companyId, type, severity, isRead } = query;
    const where: Record<string, unknown> = {};
    if (companyId) where['companyId'] = companyId;
    if (type) where['type'] = type;
    if (severity) where['severity'] = severity;
    if (isRead !== undefined) where['isRead'] = isRead;
    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return paginatedResponse(data, total, page, limit);
  }

  async markRead(id: string, companyId?: string): Promise<void> {
    const alert = await this.repo.findOne({
      where: { id, ...(companyId ? { companyId } : {}) },
    });
    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }

    await this.repo.update(alert.id, { isRead: true });
  }

  async markAllRead(companyId: string): Promise<void> {
    await this.repo.update({ companyId, isRead: false }, { isRead: true });
  }
}
