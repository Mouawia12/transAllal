import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { TrucksService } from './trucks.service';
import { CreateTruckDto } from './dto/create-truck.dto';
import { QueryTruckDto } from './dto/query-truck.dto';
import { UpdateTruckDto } from './dto/update-truck.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trucks')
export class TrucksController {
  constructor(private readonly service: TrucksService) {}

  @Get() @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  findAll(@Query() query: QueryTruckDto) { return this.service.findAll(query); }

  @Get(':id') @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }

  @Post() @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  create(@Body() dto: CreateTruckDto) { return this.service.create(dto); }

  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTruckDto) { return this.service.update(id, dto); }

  @Delete(':id') @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.service.softDelete(id); }
}
