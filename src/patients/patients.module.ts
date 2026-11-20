import { Module } from '@nestjs/common';
import { ClinicsModule } from '../clinics/clinics.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';

@Module({
  imports: [PrismaModule, ClinicsModule],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
