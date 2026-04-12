import { IsEnum } from 'class-validator';
import { TripStatus } from '../../../../common/enums/trip-status.enum';

export class UpdateTripStatusDto {
  @IsEnum([TripStatus.IN_PROGRESS, TripStatus.COMPLETED])
  status: TripStatus.IN_PROGRESS | TripStatus.COMPLETED;
}
