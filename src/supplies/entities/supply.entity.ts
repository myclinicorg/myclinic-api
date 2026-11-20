import { ApiProperty } from '@nestjs/swagger';
import { PageMetaEntity } from '../../common/page-meta.entity.js';
import { StockMovementType } from '../../generated/prisma/client.js';
import { TransactionEntity } from '../../transactions/entities/transaction.entity.js';

export class SupplyEntity {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  unit: string;

  @ApiProperty({ type: String, example: '7.5' })
  currentQuantity: string;

  @ApiProperty({ type: String, example: '2' })
  minQuantity: string;

  unitCostCents: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class SupplyPageEntity {
  data: SupplyEntity[];
  meta: PageMetaEntity;
}

export class StockMovementEntity {
  id: string;
  clinicId: string;
  supplyId: string;

  @ApiProperty({ enum: StockMovementType, enumName: 'StockMovementType' })
  type: StockMovementType;

  @ApiProperty({ type: String, example: '-2.5' })
  quantity: string;

  unitCostCents: number | null;
  reason: string | null;
  occurredAt: Date;
  appointmentId: string | null;
  createdAt: Date;
  transaction: TransactionEntity | null;
}

export class CreatedStockMovementEntity extends StockMovementEntity {
  supply: SupplyEntity;
}

export class StockMovementPageEntity {
  data: StockMovementEntity[];
  meta: PageMetaEntity;
}
