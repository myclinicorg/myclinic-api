import { Module } from '@nestjs/common';
import { ClinicsModule } from '../clinics/clinics.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ServicesController } from './services.controller.js';
import { ServicesService } from './services.service.js';

@Module({
  imports: [PrismaModule, ClinicsModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
