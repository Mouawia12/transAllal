import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class SaveLocationDto {
  @IsNumber() @Min(-90) @Max(90) lat: number;
  @IsNumber() @Min(-180) @Max(180) lng: number;
  @IsOptional() @IsNumber() @Min(0) speedKmh?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(360) heading?: number;
  @IsOptional() @IsNumber() accuracyM?: number;
  @IsOptional() @IsUUID() tripId?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) batteryLevel?: number;
}
