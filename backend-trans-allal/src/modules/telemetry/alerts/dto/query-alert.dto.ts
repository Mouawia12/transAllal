import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AlertType, Severity } from '../../../../common/enums/alert.enum';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class QueryAlertDto extends PaginationQueryDto {
  @IsOptional() @IsUUID() companyId?: string;
  @IsOptional() @IsEnum(AlertType) type?: AlertType;
  @IsOptional() @IsEnum(Severity) severity?: Severity;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() isRead?: boolean;
}
