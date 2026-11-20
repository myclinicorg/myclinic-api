import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '@nestjs/authentication';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Clinics (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  const clinic = {
    name: 'Clínica Bem Estar',
    cnpj: '12345678000195',
    phone: '11987654321',
    zipCode: '01310100',
    city: 'São Paulo',
    state: 'SP',
  };

  async function signUp(email: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({ name: 'Ana', email, password: 'correct horse battery' })
      .expect(201);
    return res.headers['set-cookie'][0].split(';')[0];
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasswordHasher)
      .useValue(new PasswordHasher({ logN: 10 }))
      .compile();
    app = moduleRef.createNestApplication();
    await app.get(PrismaService)
      .$executeRaw`TRUNCATE users, sessions, email_tokens CASCADE`;
    await app.listen(0, '127.0.0.1');
    cookie = await signUp('ana@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a clinic before reading it', async () => {
    const res = await request(app.getHttpServer())
      .get('/clinic')
      .set('Cookie', cookie)
      .expect(403);
    expect(res.body.errorCode).toBe('CLINIC_REQUIRED');
  });

  it('rejects an invalid clinic', async () => {
    await request(app.getHttpServer())
      .post('/clinic')
      .set('Cookie', cookie)
      .send({ name: '', cnpj: '123', state: 'sp' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/clinic')
      .set('Cookie', cookie)
      .send({ ...clinic, cnpj: '12345678000190' })
      .expect(400);
  });

  it('creates the clinic of the current user', async () => {
    const res = await request(app.getHttpServer())
      .post('/clinic')
      .set('Cookie', cookie)
      .send(clinic)
      .expect(201);
    expect(res.body).toMatchObject(clinic);

    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', cookie)
      .expect(200);
    expect(me.body.clinicId).toBe(res.body.id);
  });

  it('refuses a second clinic and a duplicate CNPJ', async () => {
    await request(app.getHttpServer())
      .post('/clinic')
      .set('Cookie', cookie)
      .send({ ...clinic, cnpj: '98765432000198' })
      .expect(409);

    const other = await signUp('bia@example.com');
    const res = await request(app.getHttpServer())
      .post('/clinic')
      .set('Cookie', other)
      .send(clinic)
      .expect(409);
    expect(res.body.message).toBe('CNPJ já cadastrado');
  });

  it('reads and updates the clinic', async () => {
    await request(app.getHttpServer())
      .get('/clinic')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => expect(res.body.name).toBe(clinic.name));

    const res = await request(app.getHttpServer())
      .patch('/clinic')
      .set('Cookie', cookie)
      .send({ name: 'Clínica Nova', phone: null })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Clínica Nova', phone: null });

    await request(app.getHttpServer())
      .patch('/clinic')
      .set('Cookie', cookie)
      .send({ name: null })
      .expect(400);
  });

  it('rejects anonymous requests', async () => {
    await request(app.getHttpServer()).get('/clinic').expect(401);
  });
});
