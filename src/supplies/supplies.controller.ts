import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { CreateSupplyDto } from './dto/create-supply.dto.js';
import { FindSuppliesDto } from './dto/find-supplies.dto.js';
import { UpdateSupplyDto } from './dto/update-supply.dto.js';
import { SuppliesService } from './supplies.service.js';

@ApiTags('supplies')
@ApiCookieAuth()
@Controller('supplies')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Post()
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.suppliesService.create(createSupplyDto);
  }

  @Get()
  findAll(@Query() query: FindSuppliesDto) {
    return this.suppliesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplyDto: UpdateSupplyDto,
  ) {
    return this.suppliesService.update(id, updateSupplyDto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.remove(id);
  }

  @Get(':id/movements')
  findMovements(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findMovements(id);
  }

  @Post(':id/movements')
  addMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createStockMovementDto: CreateStockMovementDto,
  ) {
    return this.suppliesService.addMovement(id, createStockMovementDto);
  }
}
