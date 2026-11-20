import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { DATE_TIME_WITH_OFFSET } from '../../common/date-time.js';

export class CreateAppointmentDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  serviceId: string;

  @IsISO8601({ strict: true })
  @Matches(DATE_TIME_WITH_OFFSET, {
    message: 'startsAt deve ser data e hora ISO 8601 com fuso horário',
  })
  startsAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
