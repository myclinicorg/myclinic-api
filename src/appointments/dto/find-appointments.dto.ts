import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { DATE_TIME_WITH_OFFSET } from '../../common/date-time.js';
import { AppointmentStatus } from '../../generated/prisma/client.js';

export class FindAppointmentsDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_TIME_WITH_OFFSET, {
    message: 'from deve ser data e hora ISO 8601 com fuso horário',
  })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_TIME_WITH_OFFSET, {
    message: 'to deve ser data e hora ISO 8601 com fuso horário',
  })
  to?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsUUID()
  patientId?: string;
}
