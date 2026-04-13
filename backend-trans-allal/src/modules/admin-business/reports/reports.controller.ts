import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { RequestContext } from '../../../common/types/request-context.type';
import { resolveRequiredCompanyId } from '../../../common/utils/company-scope.util';
import { ReportsService } from './reports.service';

enum ReportGroupBy {
  DAY = 'day',
  WEEK = 'week',
}

class SummaryQueryDto {
  @IsOptional() @IsUUID() companyId?: string;
}

class ReportQueryDto extends SummaryQueryDto {
  @IsDateString() from: string;
  @IsDateString() to: string;
}

class TripsReportQueryDto extends ReportQueryDto {
  @IsOptional() @IsEnum(ReportGroupBy) groupBy?: ReportGroupBy =
    ReportGroupBy.DAY;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: RequestContext,
    @Query() query: SummaryQueryDto,
  ) {
    return this.service.getSummary(
      resolveRequiredCompanyId(user, query.companyId),
    );
  }

  @Get('trips')
  trips(
    @CurrentUser() user: RequestContext,
    @Query() query: TripsReportQueryDto,
  ) {
    return this.service.getTripsReport(
      resolveRequiredCompanyId(user, query.companyId),
      query.from,
      query.to,
      query.groupBy ?? ReportGroupBy.DAY,
    );
  }

  @Get('drivers')
  drivers(@CurrentUser() user: RequestContext, @Query() query: ReportQueryDto) {
    return this.service.getDriversReport(
      resolveRequiredCompanyId(user, query.companyId),
      query.from,
      query.to,
    );
  }

  @Get('alerts')
  alerts(@CurrentUser() user: RequestContext, @Query() query: ReportQueryDto) {
    return this.service.getAlertsReport(
      resolveRequiredCompanyId(user, query.companyId),
      query.from,
      query.to,
    );
  }
}
