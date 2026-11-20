import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FindPatientsDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
