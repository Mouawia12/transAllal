import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { TripStatus } from '../../../../common/enums/trip-status.enum';

export class QueryTripDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsUUID() driverId?: string;
  @IsOptional() @IsEnum(TripStatus) status?: TripStatus;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
