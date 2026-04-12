import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TripStatus } from '../../../../common/enums/trip-status.enum';

export class UpdateTripDto {
  @IsOptional() @IsEnum(TripStatus) status?: TripStatus;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() originLat?: number;
  @IsOptional() @IsNumber() originLng?: number;
  @IsOptional() @IsNumber() destinationLat?: number;
  @IsOptional() @IsNumber() destinationLng?: number;
}
