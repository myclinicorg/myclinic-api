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
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  TransactionEntity,
  TransactionPageEntity,
  TransactionSummaryEntity,
} from './entities/transaction.entity.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { FindTransactionsDto, PeriodDto } from './dto/find-transactions.dto.js';
import { PayTransactionDto } from './dto/pay-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { TransactionsService } from './transactions.service.js';

@ApiTags('transactions')
@ApiCookieAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiCreatedResponse({ type: TransactionEntity })
  @Post()
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  @ApiOkResponse({ type: TransactionPageEntity })
  @Get()
  findAll(@Query() query: FindTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @ApiOkResponse({ type: TransactionSummaryEntity })
  @Get('summary')
  summary(@Query() query: PeriodDto) {
    return this.transactionsService.summary(query);
  }

  @ApiOkResponse({ type: TransactionEntity })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOne(id);
  }

  @ApiOkResponse({ type: TransactionEntity })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @ApiOkResponse({ type: TransactionEntity })
  @Post(':id/pay')
  @HttpCode(200)
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payTransactionDto: PayTransactionDto,
  ) {
    return this.transactionsService.pay(id, payTransactionDto);
  }

  @ApiOkResponse({ type: TransactionEntity })
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.cancel(id);
  }
}
