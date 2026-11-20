import { IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/client.js';

export class CompleteAppointmentDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
