import { IsEnum } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/client.js';

export class PayTransactionDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
