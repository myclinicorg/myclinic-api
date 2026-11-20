import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto.js';

export class FindServicesDto extends PaginationDto {
  @IsOptional()
  @IsBooleanString()
  active?: string;
}
