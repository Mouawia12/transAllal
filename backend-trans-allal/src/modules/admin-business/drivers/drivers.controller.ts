import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { RequestContext } from '../../../common/types/request-context.type';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { QueryDriverDto } from './dto/query-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly service: DriversService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  findAll(@Query() query: QueryDriverDto) { return this.service.findAll(query); }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  getMe(@CurrentUser() user: RequestContext) {
    if (!user.driverId) throw new Error('Driver not found');
    return this.service.findOne(user.driverId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.service.findOne(id); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  create(@Body() dto: CreateDriverDto) { return this.service.create(dto); }

  @Patch('me')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  updateMe(@CurrentUser() user: RequestContext, @Body() dto: UpdateDriverDto) {
    if (!user.driverId) throw new Error('Driver not found');
    return this.service.update(user.driverId, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDriverDto) { return this.service.update(id, dto); }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.service.softDelete(id); }
}
