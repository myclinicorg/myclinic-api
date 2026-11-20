import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DATE_ONLY } from '../../common/date-time.js';
import {
  PaymentMethod,
  TransactionCategory,
  TransactionType,
} from '../../generated/prisma/client.js';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  type: TransactionType;

  @IsEnum(TransactionCategory)
  category: TransactionCategory;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  amountCents: number;

  @IsISO8601({ strict: true })
  @Matches(DATE_ONLY, { message: 'dueDate deve estar no formato AAAA-MM-DD' })
  dueDate: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
