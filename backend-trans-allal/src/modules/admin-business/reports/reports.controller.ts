import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ReportsService } from './reports.service';

class ReportQueryDto {
  @IsUUID() companyId: string;
  @IsDateString() from: string;
  @IsDateString() to: string;
}

class TripsReportQueryDto extends ReportQueryDto {
  @IsOptional() @IsEnum(['day', 'week']) groupBy?: 'day' | 'week' = 'day';
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary') summary(@Query('companyId') companyId: string) { return this.service.getSummary(companyId); }
  @Get('trips') trips(@Query() q: TripsReportQueryDto) { return this.service.getTripsReport(q.companyId, q.from, q.to, q.groupBy ?? 'day'); }
  @Get('drivers') drivers(@Query() q: ReportQueryDto) { return this.service.getDriversReport(q.companyId, q.from, q.to); }
  @Get('alerts') alerts(@Query() q: ReportQueryDto) { return this.service.getAlertsReport(q.companyId, q.from, q.to); }
}
