import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { RequestContext } from '../../../common/types/request-context.type';
import { TrackingService } from './tracking.service';
import { SaveLocationDto } from './dto/save-location.dto';
import { QueryFleetDto, QueryTrackingDto } from './dto/query-tracking.dto';

@UseGuards(JwtAuthGuard)
@Controller('tracking')
export class TrackingController {
  constructor(private readonly service: TrackingService) {}

  @Post('session/start')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  startSession(@CurrentUser() user: RequestContext) {
    return this.service.startSession(user.driverId!).then(() => ({ isOnline: true }));
  }

  @Post('session/stop')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  stopSession(@CurrentUser() user: RequestContext) {
    return this.service.stopSession(user.driverId!).then(() => ({ isOnline: false }));
  }

  @Post('location')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  saveLocation(@CurrentUser() user: RequestContext, @Body() dto: SaveLocationDto) {
    return this.service.saveLocation(user.driverId!, user.companyId!, dto);
  }

  @Get('live')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  getLive(@Query() query: QueryFleetDto) {
    return this.service.getLiveLocations(query.companyId!);
  }

  @Get('fleet')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  getFleet(@Query() query: QueryFleetDto) {
    return this.service.getAllTruckPositions(query.companyId!);
  }

  @Get('driver/:driverId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  getHistory(@Param('driverId', ParseUUIDPipe) driverId: string, @Query() query: QueryTrackingDto) {
    return this.service.getHistory(driverId, query.from, query.to);
  }
}
