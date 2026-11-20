import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsInt()
  @Min(5)
  @Max(720)
  durationMinutes: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
