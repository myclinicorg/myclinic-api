import { PartialType } from '@nestjs/swagger';
import { CreateSupplyDto } from './create-supply.dto.js';

export class UpdateSupplyDto extends PartialType(CreateSupplyDto, {
  skipNullProperties: false,
}) {}
