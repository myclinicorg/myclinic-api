import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';
import { DATE_TIME_WITH_OFFSET } from '../../common/date-time.js';
import {
  PaymentMethod,
  StockMovementType,
} from '../../generated/prisma/client.js';

export class CreateStockMovementDto {
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @IsNumber({ maxDecimalPlaces: 3 })
  @NotEquals(0)
  @Min(-999_999_999)
  @Max(999_999_999)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCostCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(DATE_TIME_WITH_OFFSET, {
    message: 'occurredAt deve ser data e hora ISO 8601 com fuso horário',
  })
  occurredAt?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsBoolean()
  registerExpense?: boolean;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
