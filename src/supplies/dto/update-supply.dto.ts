import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplyDto } from './create-supply.dto.js';

export class UpdateSupplyDto extends PartialType(CreateSupplyDto, {
  skipNullProperties: false,
}) {}
