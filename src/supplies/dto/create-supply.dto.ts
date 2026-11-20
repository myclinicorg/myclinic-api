import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSupplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999_999_999)
  minQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCostCents?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
