import { Module } from '@nestjs/common';
import { ClinicsModule } from '../clinics/clinics.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

@Module({
  imports: [PrismaModule, ClinicsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
