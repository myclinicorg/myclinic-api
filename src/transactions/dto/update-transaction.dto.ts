import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto.js';

export class UpdateTransactionDto extends PartialType(
  OmitType(CreateTransactionDto, ['type', 'paymentMethod'] as const),
  { skipNullProperties: false },
) {}
