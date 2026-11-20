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
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreatedStockMovementEntity,
  StockMovementPageEntity,
  SupplyEntity,
  SupplyPageEntity,
} from './entities/supply.entity.js';
import { PaginationDto } from '../common/pagination.dto.js';
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

  @ApiCreatedResponse({ type: SupplyEntity })
  @Post()
  create(@Body() createSupplyDto: CreateSupplyDto) {
    return this.suppliesService.create(createSupplyDto);
  }

  @ApiOkResponse({ type: SupplyPageEntity })
  @Get()
  findAll(@Query() query: FindSuppliesDto) {
    return this.suppliesService.findAll(query);
  }

  @ApiOkResponse({ type: SupplyEntity })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.findOne(id);
  }

  @ApiOkResponse({ type: SupplyEntity })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplyDto: UpdateSupplyDto,
  ) {
    return this.suppliesService.update(id, updateSupplyDto);
  }

  @ApiNoContentResponse()
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliesService.remove(id);
  }

  @ApiOkResponse({ type: StockMovementPageEntity })
  @Get(':id/movements')
  findMovements(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.suppliesService.findMovements(id, pagination);
  }

  @ApiCreatedResponse({ type: CreatedStockMovementEntity })
  @Post(':id/movements')
  addMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createStockMovementDto: CreateStockMovementDto,
  ) {
    return this.suppliesService.addMovement(id, createStockMovementDto);
  }
}
