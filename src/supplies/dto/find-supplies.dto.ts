import { IsBooleanString, IsOptional } from 'class-validator';

export class FindSuppliesDto {
  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @IsBooleanString()
  lowStock?: string;
}
