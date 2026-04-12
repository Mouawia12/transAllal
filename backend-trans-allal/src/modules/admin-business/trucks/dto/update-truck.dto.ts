import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTruckDto {
  @IsOptional() @IsString() @MaxLength(30) plateNumber?: string;
  @IsOptional() @IsString() @MaxLength(100) brand?: string;
  @IsOptional() @IsString() @MaxLength(100) model?: string;
  @IsOptional() @IsNumber() year?: number;
  @IsOptional() @IsNumber() capacityTons?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
