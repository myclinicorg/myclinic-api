import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '@nestjs/authentication';
import { InMemoryMailTransport, MailTransport } from '@nestjs/mail';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PasswordResetMail } from '../src/auth/password-reset.mailer.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Authentication (e2e)', () => {
  const mailbox = new InMemoryMailTransport();
  let app: INestApplication;
  const ana = {
    name: 'Ana',
    email: 'ana@example.com',
    password: 'correct horse battery',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailTransport)
      .useValue(mailbox)
      .overrideProvider(PasswordHasher)
      .useValue(new PasswordHasher({ logN: 10 }))
      .compile();
    app = moduleRef.createNestApplication();
    await app.get(PrismaService)
      .$executeRaw`TRUNCATE users, sessions, email_tokens CASCADE`;
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs up and reads the profile with the session cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send(ana)
      .expect(201);
    const cookie = res.headers['set-cookie'][0].split(';')[0];

    await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', cookie)
      .expect(200, {
        id: res.body.id,
        name: ana.name,
        email: ana.email,
        emailVerified: false,
        clinicId: null,
      });
  });

  it('rejects a duplicate email and an invalid body', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send(ana)
      .expect(409);
    const invalid = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(invalid.body.message).toEqual(
      expect.arrayContaining([
        'email deve ser um e-mail válido',
        'password deve ter no mínimo 12 caracteres',
      ]),
    );
  });

  it('signs in and out', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: ana.email, password: ana.password })
      .expect(200, { mfaRequired: false });
    const cookie = res.headers['set-cookie'][0].split(';')[0];

    await request(app.getHttpServer())
      .post('/auth/sign-out')
      .set('Cookie', cookie)
      .expect(204);
    await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', cookie)
      .expect(401);
  });

  it('resets a forgotten password', async () => {
    await request(app.getHttpServer())
      .post('/auth/password/forgot')
      .send({ email: ana.email })
      .expect(202);
    const mail = await vi.waitFor(() =>
      mailbox.assertSent({ to: ana.email, mail: PasswordResetMail }),
    );
    const token = mail.link('/redefinir-senha').searchParams.get('token');

    await request(app.getHttpServer())
      .post('/auth/password/reset')
      .send({ token, password: 'a brand new passphrase' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: ana.email, password: ana.password })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: ana.email, password: 'a brand new passphrase' })
      .expect(200);
  });

  it('rejects anonymous requests and wrong passwords', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: ana.email, password: 'not the password' })
      .expect(401);
  });
});
