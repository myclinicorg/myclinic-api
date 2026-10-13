import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service.js';
import { PatientsModule } from './patients/patients.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PatientsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
