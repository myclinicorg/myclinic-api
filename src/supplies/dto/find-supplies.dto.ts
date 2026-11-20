import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto.js';

export class FindSuppliesDto extends PaginationDto {
  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @IsBooleanString()
  lowStock?: string;
}
