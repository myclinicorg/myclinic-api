import { Module } from '@nestjs/common';
import { ClinicsModule } from '../clinics/clinics.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SuppliesController } from './supplies.controller.js';
import { SuppliesService } from './supplies.service.js';

@Module({
  imports: [PrismaModule, ClinicsModule],
  controllers: [SuppliesController],
  providers: [SuppliesService],
})
export class SuppliesModule {}
