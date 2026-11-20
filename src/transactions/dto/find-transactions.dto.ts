import { IsEnum, IsISO8601, IsOptional, Matches } from 'class-validator';
import { DATE_ONLY } from '../../common/date-time.js';
import {
  TransactionCategory,
  TransactionStatus,
  TransactionType,
} from '../../generated/prisma/client.js';

export class PeriodDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_ONLY, { message: 'from deve estar no formato AAAA-MM-DD' })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_ONLY, { message: 'to deve estar no formato AAAA-MM-DD' })
  to?: string;
}

export class FindTransactionsDto extends PeriodDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsEnum(TransactionCategory)
  category?: TransactionCategory;
}
