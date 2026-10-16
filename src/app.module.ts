import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service.js';
import { PatientsModule } from './patients/patients.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { SuppliesModule } from './supplies/supplies.module.js';
import { ClinicsModule } from './clinics/clinics.module.js';
import { ServicesModule } from './services/services.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PatientsModule, TransactionsModule, SuppliesModule, ClinicsModule, ServicesModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
