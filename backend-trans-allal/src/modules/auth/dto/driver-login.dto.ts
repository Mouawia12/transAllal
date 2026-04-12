import { IsString, MinLength } from 'class-validator';

export class DriverLoginDto {
  @IsString()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;
}
