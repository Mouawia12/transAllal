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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
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
  findAll(@CurrentUser() user: RequestContext, @Query() query: QueryDriverDto) {
    query.companyId = resolveOptionalCompanyId(user, query.companyId);
    return this.service.findAll(query);
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  getMe(@CurrentUser() user: RequestContext) {
    return this.service.findOne(resolveDriverId(user));
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN, Role.DISPATCHER)
  findOne(
    @CurrentUser() user: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(id, resolveOptionalCompanyId(user));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  create(@CurrentUser() user: RequestContext, @Body() dto: CreateDriverDto) {
    dto.companyId = resolveRequiredCompanyId(user, dto.companyId);
    return this.service.create(dto);
  }

  @Patch('me')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  updateMe(@CurrentUser() user: RequestContext, @Body() dto: UpdateDriverDto) {
    return this.service.update(resolveDriverId(user), dto);
  }

  @Patch('me/push-token')
  @UseGuards(RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePushToken(
    @CurrentUser() user: RequestContext,
    @Body() body: { token: string | null },
  ) {
    return this.service.updatePushToken(resolveDriverId(user), body.token ?? null);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  update(
    @CurrentUser() user: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.service.update(id, dto, resolveOptionalCompanyId(user));
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.COMPANY_ADMIN)
  remove(
    @CurrentUser() user: RequestContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.softDelete(id, resolveOptionalCompanyId(user));
  }
}
