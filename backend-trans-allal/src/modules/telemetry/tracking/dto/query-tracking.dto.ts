import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryTrackingDto {
  @IsDateString() from: string;
  @IsDateString() to: string;
}

export class QueryFleetDto {
  @IsOptional() @IsUUID() companyId?: string;
}
