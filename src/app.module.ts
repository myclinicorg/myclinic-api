import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { AuthenticationModule } from '@nestjs/authentication';
import {
  FileTemplateEngine,
  LogMailTransport,
  MailModule,
  SmtpTransport,
} from '@nestjs/mail';
import { join } from 'node:path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true }) },
  ],
})
export class AppModule {}
