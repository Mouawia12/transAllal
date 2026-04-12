import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from '../../../common/enums/role.enum';
import { paginatedResponse } from '../../../common/interfaces/api-response.interface';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { User } from './user.entity';

export class CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  companyId?: string;
}

export class UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async findAll(query: PaginationQueryDto) {
    const { page, limit } = query;
    const [data, total] = await this.repo.findAndCount({ skip: (page - 1) * limit, take: limit, where: { role: Role.SUPER_ADMIN } });
    return paginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const hash = await bcrypt.hash(dto.password, 10);
    return this.repo.save(this.repo.create({ ...dto, password: hash }));
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.findOne(id);
    await this.repo.update(id, { isActive: false });
  }
}
