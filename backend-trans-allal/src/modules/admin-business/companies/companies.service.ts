import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginatedResponse } from '../../../common/interfaces/api-response.interface';
import { Company } from './company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company) private readonly repo: Repository<Company>,
  ) {}

  async findAll(query: QueryCompanyDto) {
    const { page, limit, isActive, search } = query;
    const qb = this.repo.createQueryBuilder('company');
    if (isActive !== undefined) {
      qb.andWhere('company.isActive = :isActive', { isActive });
    }
    if (search) {
      qb.andWhere('LOWER(company.name) LIKE :search', {
        search: `%${search.toLowerCase()}%`,
      });
    }
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('company.createdAt', 'DESC')
      .getManyAndCount();
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.repo.findOne({ where: { id } });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.update(id, { isActive: false });
  }
}
