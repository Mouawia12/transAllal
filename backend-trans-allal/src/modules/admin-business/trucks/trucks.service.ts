import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginatedResponse } from '../../../common/interfaces/api-response.interface';
import { Truck } from './truck.entity';
import { CreateTruckDto } from './dto/create-truck.dto';
import { QueryTruckDto } from './dto/query-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';

@Injectable()
export class TrucksService {
  constructor(@InjectRepository(Truck) private readonly repo: Repository<Truck>) {}

  async findAll(query: QueryTruckDto) {
    const { page, limit, companyId, isActive } = query;
    const where: Record<string, unknown> = {};
    if (companyId) where['companyId'] = companyId;
    if (isActive !== undefined) where['isActive'] = isActive;
    const [data, total] = await this.repo.findAndCount({ where, skip: (page - 1) * limit, take: limit, order: { createdAt: 'DESC' }, relations: ['company'] });
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<Truck> {
    const truck = await this.repo.findOne({ where: { id }, relations: ['company'] });
    if (!truck) throw new NotFoundException(`Truck ${id} not found`);
    return truck;
  }

  async create(dto: CreateTruckDto): Promise<Truck> { return this.repo.save(this.repo.create(dto)); }
  async update(id: string, dto: UpdateTruckDto): Promise<Truck> { await this.findOne(id); await this.repo.update(id, dto); return this.findOne(id); }
  async softDelete(id: string): Promise<void> { await this.findOne(id); await this.repo.update(id, { isActive: false }); }
}
