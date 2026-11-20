import { IsBooleanString, IsOptional } from 'class-validator';

export class FindServicesDto {
  @IsOptional()
  @IsBooleanString()
  active?: string;
}
