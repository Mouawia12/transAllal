import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AlertsService } from './alerts.service';
import { QueryAlertDto } from './dto/query-alert.dto';

class MarkAllReadDto {
  @IsUUID() companyId: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get() findAll(@Query() query: QueryAlertDto) { return this.service.findAll(query); }
  @Patch(':id/read') markRead(@Param('id', ParseUUIDPipe) id: string) { return this.service.markRead(id); }
  @Patch('read-all') markAllRead(@Body() dto: MarkAllReadDto) { return this.service.markAllRead(dto.companyId); }
}
