import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto.js';

export class FindPatientsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
