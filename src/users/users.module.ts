import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MeController } from './me.controller.js';
import { UsersRepository } from './users.repository.js';

@Module({
  imports: [PrismaModule],
  controllers: [MeController],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
