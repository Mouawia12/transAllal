import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
    return this.service
      .startSession(resolveDriverId(user))
      .then(() => ({ isOnline: true }));
  }

  @Post('session/stop')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  stopSession(@CurrentUser() user: RequestContext) {
    return this.service
      .stopSession(resolveDriverId(user))
      .then(() => ({ isOnline: false }));
  }

  @Post('location')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  saveLocation(
    @CurrentUser() user: RequestContext,
    @Body() dto: SaveLocationDto,
  ) {
    return this.service.saveLocation(
      resolveDriverId(user),
      resolveRequiredCompanyId(user),
      dto,
    );
  }

  @Get('live')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  getLive(@CurrentUser() user: RequestContext, @Query() query: QueryFleetDto) {
    return this.service.getLiveLocations(
      resolveRequiredCompanyId(user, query.companyId),
    );
  }

  @Get('fleet')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  getFleet(@CurrentUser() user: RequestContext, @Query() query: QueryFleetDto) {
    return this.service.getAllTruckPositions(
      resolveRequiredCompanyId(user, query.companyId),
    );
  }

  @Get('driver/:driverId')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  getHistory(
    @CurrentUser() user: RequestContext,
    @Param('driverId', ParseUUIDPipe) driverId: string,
    @Query() query: QueryTrackingDto,
  ) {
    return this.service.getHistory(
      driverId,
      query.from,
      query.to,
      resolveOptionalCompanyId(user),
    );
  }
}
