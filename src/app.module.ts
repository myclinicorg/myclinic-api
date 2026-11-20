import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { AuthenticationModule } from '@nestjs/authentication';
import {
  FileTemplateEngine,
  LogMailTransport,
  MailModule,
  SmtpTransport,
} from '@nestjs/mail';
import {
  ThrottlerGuard,
  ThrottlerModule,
  minutes,
  normalizeIp,
} from '@nestjs/throttler';
import { join } from 'node:path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { accountEmail } from './auth/account-email.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ClinicsModule } from './clinics/clinics.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { ServicesModule } from './services/services.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { SuppliesModule } from './supplies/supplies.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: minutes(1), limit: 100 },
      {
        name: 'account',
        ttl: minutes(15),
        limit: 5,
        skipIf: (context) => !accountEmail(context.switchToHttp().getRequest()),
        getTracker: (req) => `${accountEmail(req)}|${normalizeIp(req.ip)}`,
      },
    ]),
    MailModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const smtpUrl = config.get<string>('SMTP_URL');
        return {
          transport: smtpUrl
            ? new SmtpTransport({ url: smtpUrl })
            : new LogMailTransport(),
          templates: new FileTemplateEngine({
            dir: join(import.meta.dirname, 'mail/templates'),
          }),
          from: config.getOrThrow<string>('MAIL_FROM'),
        };
      },
    }),
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        session: {
          absoluteTtl: '14d',
          idleTtl: '3d',
        },
        passwordReset: {
          url: `${config.getOrThrow<string>('APP_URL')}/reset-password`,
        },
      }),
    }),
    UsersModule,
    AuthModule,
    ClinicsModule,
    PatientsModule,
    ServicesModule,
    AppointmentsModule,
    SuppliesModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true }) },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
