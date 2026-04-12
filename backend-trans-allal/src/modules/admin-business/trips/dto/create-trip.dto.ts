import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTripDto {
  @IsUUID() companyId: string;
  @IsOptional() @IsUUID() driverId?: string;
  @IsOptional() @IsUUID() truckId?: string;
  @IsString() @MaxLength(255) origin: string;
  @IsString() @MaxLength(255) destination: string;
  @IsOptional() @IsNumber() originLat?: number;
  @IsOptional() @IsNumber() originLng?: number;
  @IsOptional() @IsNumber() destinationLat?: number;
  @IsOptional() @IsNumber() destinationLng?: number;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsString() notes?: string;
}
