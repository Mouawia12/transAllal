import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { RequestContext } from '../../../common/types/request-context.type';
import {
  resolveDriverId,
  resolveOptionalCompanyId,
  resolveRequiredCompanyId,
} from '../../../common/utils/company-scope.util';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { QueryTripDto } from './dto/query-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';

@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly service: TripsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  findAll(@CurrentUser() user: RequestContext, @Query() query: QueryTripDto) {
    query.companyId = resolveOptionalCompanyId(user, query.companyId);
    return this.service.findAll(query);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  getMyTrips(@CurrentUser() user: RequestContext) {
    return this.service.getMyTrips(resolveDriverId(user));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER, Role.DRIVER)
  findOne(
    @CurrentUser() user: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (user.role === Role.DRIVER) {
      return this.service.findOne(id, { driverId: resolveDriverId(user) });
    }

    return this.service.findOne(id, {
      companyId: resolveOptionalCompanyId(user),
    });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  create(@CurrentUser() user: RequestContext, @Body() dto: CreateTripDto) {
    dto.companyId = resolveRequiredCompanyId(user, dto.companyId);
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  update(
    @CurrentUser() user: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.service.update(id, dto, resolveOptionalCompanyId(user));
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  updateStatus(
    @CurrentUser() user: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripStatusDto,
  ) {
    return this.service.updateStatusForDriver(
      resolveDriverId(user),
      id,
      dto.status,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  cancel(
    @CurrentUser() user: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(id, resolveOptionalCompanyId(user));
  }

  @Get(':id/track')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  getTrack(
    @CurrentUser() user: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getTrackHistory(id, resolveOptionalCompanyId(user));
  }
}
