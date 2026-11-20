import { ApiProperty } from '@nestjs/swagger';
import { PageMetaEntity } from '../../common/page-meta.entity.js';
import {
  PaymentMethod,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
} from '../../generated/prisma/client.js';

export class TransactionEntity {
  id: string;
  clinicId: string;

  @ApiProperty({ enum: TransactionType, enumName: 'TransactionType' })
  type: TransactionType;

  @ApiProperty({ enum: TransactionCategory, enumName: 'TransactionCategory' })
  category: TransactionCategory;

  description: string | null;
  amountCents: number;

  @ApiProperty({ enum: TransactionStatus, enumName: 'TransactionStatus' })
  status: TransactionStatus;

  dueDate: Date;
  paidAt: Date | null;

  @ApiProperty({
    enum: PaymentMethod,
    enumName: 'PaymentMethod',
    nullable: true,
  })
  paymentMethod: PaymentMethod | null;

  appointmentId: string | null;
  stockMovementId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TransactionPageEntity {
  data: TransactionEntity[];
  meta: PageMetaEntity;
}

export class CategoryTotalEntity {
  @ApiProperty({ enum: TransactionType, enumName: 'TransactionType' })
  type: TransactionType;

  @ApiProperty({ enum: TransactionCategory, enumName: 'TransactionCategory' })
  category: TransactionCategory;

  totalCents: number;
}

export class TransactionSummaryEntity {
  from: string | null;
  to: string | null;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  pendingIncomeCents: number;
  pendingExpenseCents: number;
  byCategory: CategoryTotalEntity[];
}
