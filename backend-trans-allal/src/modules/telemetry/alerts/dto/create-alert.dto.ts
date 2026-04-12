import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AlertType, Severity } from '../../../../common/enums/alert.enum';

export class CreateAlertDto {
  @IsUUID() companyId: string;
  @IsOptional() @IsUUID() driverId?: string;
  @IsOptional() @IsUUID() tripId?: string;
  @IsEnum(AlertType) type: AlertType;
  @IsEnum(Severity) severity: Severity;
  @IsOptional() @IsString() message?: string;
}
