import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ClinicContext } from './clinic-context.js';
import { ClinicsController } from './clinics.controller.js';
import { ClinicsService } from './clinics.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ClinicsController],
  providers: [ClinicsService, ClinicContext],
  exports: [ClinicContext],
})
export class ClinicsModule {}
