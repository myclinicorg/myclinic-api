import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateAppointmentDto } from './create-appointment.dto.js';

export class UpdateAppointmentDto extends PartialType(
  PickType(CreateAppointmentDto, ['startsAt', 'notes'] as const),
  { skipNullProperties: false },
) {}
