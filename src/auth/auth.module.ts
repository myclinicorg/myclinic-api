import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { CredentialsService } from './credentials.service.js';
import { PasswordResetController } from './password-reset.controller.js';
import { PasswordResetMailer } from './password-reset.mailer.js';
import { PrismaAuthenticationStore } from './prisma-authentication.store.js';
import { SessionAuth } from './session-auth.provider.js';

@Module({
  imports: [UsersModule, PrismaModule],
  controllers: [AuthController, PasswordResetController],
  providers: [
    SessionAuth,
    CredentialsService,
    PasswordResetMailer,
    PrismaAuthenticationStore,
  ],
})
export class AuthModule {}
