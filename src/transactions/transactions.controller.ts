import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { FindTransactionsDto, PeriodDto } from './dto/find-transactions.dto.js';
import { PayTransactionDto } from './dto/pay-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { TransactionsService } from './transactions.service.js';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  findAll(@Query() query: FindTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get('summary')
  summary(@Query() query: PeriodDto) {
    return this.transactionsService.summary(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Post(':id/pay')
  @HttpCode(200)
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payTransactionDto: PayTransactionDto,
  ) {
    return this.transactionsService.pay(id, payTransactionDto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.cancel(id);
  }
}
