import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import type { RequestContext } from '../../../common/types/request-context.type';
import {
  resolveOptionalCompanyId,
  resolveRequiredCompanyId,
} from '../../../common/utils/company-scope.util';
import { AlertsService } from './alerts.service';
import { QueryAlertDto } from './dto/query-alert.dto';

class MarkAllReadDto {
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestContext, @Query() query: QueryAlertDto) {
    query.companyId = resolveOptionalCompanyId(user, query.companyId);
    return this.service.findAll(query);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUser() user: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markRead(id, resolveOptionalCompanyId(user));
  }

  @Patch('read-all')
  markAllRead(
    @CurrentUser() user: RequestContext,
    @Body() dto: MarkAllReadDto,
  ) {
    return this.service.markAllRead(
      resolveRequiredCompanyId(user, dto.companyId),
    );
  }
}
