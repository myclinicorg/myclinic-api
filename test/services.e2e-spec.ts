import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '@nestjs/authentication';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Services (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let otherCookie: string;
  let serviceId: string;
  const service = {
    name: 'Consulta',
    priceCents: 15000,
    durationMinutes: 50,
  };

  async function signUp(email: string, cnpj: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({ name: 'Ana', email, password: 'correct horse battery' })
      .expect(201);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    await request(app.getHttpServer())
      .post('/clinic')
      .set('Cookie', cookie)
      .send({ name: 'Clínica', cnpj })
      .expect(201);
    return cookie;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PasswordHasher)
      .useValue(new PasswordHasher({ logN: 10 }))
      .compile();
    app = moduleRef.createNestApplication();
    prisma = app.get(PrismaService);
    await prisma.$executeRaw`TRUNCATE users, sessions, email_tokens CASCADE`;
    await app.listen(0, '127.0.0.1');
    cookie = await signUp('ana@example.com', '12345678000195');
    otherCookie = await signUp('bia@example.com', '98765432000198');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a service', async () => {
    const res = await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', cookie)
      .send(service)
      .expect(201);
    expect(res.body).toMatchObject({ ...service, active: true });
    serviceId = res.body.id;
  });

  it('rejects an invalid service', async () => {
    await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', cookie)
      .send({ name: 'Avaliação', priceCents: 99.9, durationMinutes: 0 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', cookie)
      .send({ name: 'Avaliação', priceCents: -1, durationMinutes: 30 })
      .expect(400);
  });

  it('lists services and filters by active', async () => {
    await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', cookie)
      .send({
        name: 'Avaliação',
        priceCents: 8000,
        durationMinutes: 30,
        active: false,
      })
      .expect(201);

    const all = await request(app.getHttpServer())
      .get('/services')
      .set('Cookie', cookie)
      .expect(200);
    expect(all.body.map((s: { name: string }) => s.name)).toEqual([
      'Avaliação',
      'Consulta',
    ]);

    const active = await request(app.getHttpServer())
      .get('/services')
      .query({ active: 'true' })
      .set('Cookie', cookie)
      .expect(200);
    expect(active.body.map((s: { name: string }) => s.name)).toEqual([
      'Consulta',
    ]);

    await request(app.getHttpServer())
      .get('/services')
      .query({ active: 'sim' })
      .set('Cookie', cookie)
      .expect(400);
  });

  it('updates a service', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Cookie', cookie)
      .send({ priceCents: 18000, description: 'Primeira consulta' })
      .expect(200);
    expect(res.body).toMatchObject({
      priceCents: 18000,
      description: 'Primeira consulta',
    });

    await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Cookie', cookie)
      .send({ priceCents: null })
      .expect(400);
  });

  it('hides services of other clinics', async () => {
    await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .set('Cookie', otherCookie)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/services/${serviceId}`)
      .set('Cookie', otherCookie)
      .expect(404);
  });

  it('refuses to delete a service with appointments', async () => {
    const { clinicId } = await prisma.service.findUniqueOrThrow({
      where: { id: serviceId },
    });
    const patient = await prisma.patient.create({
      data: { clinicId, fullName: 'Maria', cpf: '12345678909' },
    });
    await prisma.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        serviceId,
        startsAt: new Date('2026-12-01T13:00:00Z'),
        endsAt: new Date('2026-12-01T13:50:00Z'),
        priceCents: 18000,
      },
    });

    await request(app.getHttpServer())
      .delete(`/services/${serviceId}`)
      .set('Cookie', cookie)
      .expect(409);
  });

  it('deletes a service without appointments', async () => {
    const res = await request(app.getHttpServer())
      .post('/services')
      .set('Cookie', cookie)
      .send({ name: 'Retorno', priceCents: 0, durationMinutes: 20 })
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/services/${res.body.id}`)
      .set('Cookie', cookie)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/services/${res.body.id}`)
      .set('Cookie', cookie)
      .expect(404);
  });
});
