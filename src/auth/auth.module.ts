import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { CredentialsService } from './credentials.service.js';
import { PrismaAuthenticationStore } from './prisma-authentication.store.js';
import { SessionAuth } from './session-auth.provider.js';

@Module({
  imports: [UsersModule, PrismaModule],
  controllers: [AuthController],
  providers: [SessionAuth, CredentialsService, PrismaAuthenticationStore],
})
export class AuthModule {}
