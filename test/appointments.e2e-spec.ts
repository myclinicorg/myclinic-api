import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '@nestjs/authentication';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Appointments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let otherCookie: string;
  let patientId: string;
  let serviceId: string;

  const http = () => request(app.getHttpServer());

  async function signUp(email: string, cnpj: string) {
    const res = await http()
      .post('/auth/sign-up')
      .send({ name: 'Ana', email, password: 'correct horse battery' })
      .expect(201);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    await http()
      .post('/clinic')
      .set('Cookie', cookie)
      .send({ name: 'Clínica', cnpj })
      .expect(201);
    return cookie;
  }

  function schedule(startsAt: string, as = cookie) {
    return http()
      .post('/appointments')
      .set('Cookie', as)
      .send({ patientId, serviceId, startsAt });
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
    cookie = await signUp('ana@example.com', '12345678000190');
    otherCookie = await signUp('bia@example.com', '98765432000110');

    const patient = await http()
      .post('/patients')
      .set('Cookie', cookie)
      .send({ fullName: 'Maria Souza', cpf: '12345678901' })
      .expect(201);
    patientId = patient.body.id;
    const service = await http()
      .post('/services')
      .set('Cookie', cookie)
      .send({ name: 'Consulta', priceCents: 15000, durationMinutes: 50 })
      .expect(201);
    serviceId = service.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('schedules with the service duration and price', async () => {
    const res = await schedule('2026-12-01T10:00:00-03:00').expect(201);
    expect(res.body).toMatchObject({
      startsAt: '2026-12-01T13:00:00.000Z',
      endsAt: '2026-12-01T13:50:00.000Z',
      priceCents: 15000,
      status: 'SCHEDULED',
      patient: { id: patientId, fullName: 'Maria Souza' },
      service: { id: serviceId, name: 'Consulta' },
    });
  });

  it('rejects overlapping times and accepts adjacent ones', async () => {
    const res = await schedule('2026-12-01T10:30:00-03:00').expect(409);
    expect(res.body.errorCode).toBe('SCHEDULE_CONFLICT');
    await schedule('2026-12-01T10:50:00-03:00').expect(201);
  });

  it('accepts only one of concurrent requests for the same time', async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => schedule('2026-12-02T09:00:00-03:00')),
    );
    expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      201, 409, 409, 409, 409,
    ]);
  });

  it('validates the request', async () => {
    await schedule('2026-12-03T09:00:00').expect(400);
    await http()
      .post('/appointments')
      .set('Cookie', otherCookie)
      .send({ patientId, serviceId, startsAt: '2026-12-03T09:00:00-03:00' })
      .expect(400);

    await http()
      .patch(`/services/${serviceId}`)
      .set('Cookie', cookie)
      .send({ active: false })
      .expect(200);
    await schedule('2026-12-03T09:00:00-03:00').expect(400);
    await http()
      .patch(`/services/${serviceId}`)
      .set('Cookie', cookie)
      .send({ active: true })
      .expect(200);
  });

  it('lists appointments in a period', async () => {
    const res = await http()
      .get('/appointments')
      .query({
        from: '2026-12-01T00:00:00-03:00',
        to: '2026-12-02T00:00:00-03:00',
      })
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.map((a: { startsAt: string }) => a.startsAt)).toEqual([
      '2026-12-01T13:00:00.000Z',
      '2026-12-01T13:50:00.000Z',
    ]);

    const other = await http()
      .get('/appointments')
      .set('Cookie', otherCookie)
      .expect(200);
    expect(other.body).toEqual([]);
  });

  it('reschedules, confirms and cancels', async () => {
    const { body } = await schedule('2026-12-04T14:00:00-03:00').expect(201);

    await http()
      .post(`/appointments/${body.id}/confirm`)
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('CONFIRMED'));
    await http()
      .post(`/appointments/${body.id}/confirm`)
      .set('Cookie', cookie)
      .expect(409);

    await http()
      .patch(`/appointments/${body.id}`)
      .set('Cookie', cookie)
      .send({ startsAt: '2026-12-01T10:20:00-03:00' })
      .expect(409);
    const moved = await http()
      .patch(`/appointments/${body.id}`)
      .set('Cookie', cookie)
      .send({ startsAt: '2026-12-04T16:00:00-03:00' })
      .expect(200);
    expect(moved.body).toMatchObject({
      startsAt: '2026-12-04T19:00:00.000Z',
      endsAt: '2026-12-04T19:50:00.000Z',
      status: 'SCHEDULED',
    });

    const canceled = await http()
      .post(`/appointments/${body.id}/cancel`)
      .set('Cookie', cookie)
      .send({ reason: 'Paciente viajou' })
      .expect(200);
    expect(canceled.body).toMatchObject({
      status: 'CANCELED',
      cancelReason: 'Paciente viajou',
    });
    expect(canceled.body.canceledAt).toEqual(expect.any(String));

    await http()
      .patch(`/appointments/${body.id}`)
      .set('Cookie', cookie)
      .send({ startsAt: '2026-12-05T16:00:00-03:00' })
      .expect(409);
    await schedule('2026-12-04T16:00:00-03:00').expect(201);
  });

  it('completes and records the income', async () => {
    const { body } = await schedule('2026-12-07T09:00:00-03:00').expect(201);
    await http()
      .patch(`/services/${serviceId}`)
      .set('Cookie', cookie)
      .send({ priceCents: 20000 })
      .expect(200);

    const res = await http()
      .post(`/appointments/${body.id}/complete`)
      .set('Cookie', cookie)
      .send({ paymentMethod: 'PIX' })
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'COMPLETED',
      transaction: {
        type: 'INCOME',
        category: 'SERVICE',
        status: 'PAID',
        amountCents: 15000,
        paymentMethod: 'PIX',
        appointmentId: body.id,
      },
    });

    await http()
      .post(`/appointments/${body.id}/complete`)
      .set('Cookie', cookie)
      .send({ paymentMethod: 'PIX' })
      .expect(409);
    expect(
      await prisma.transaction.count({ where: { appointmentId: body.id } }),
    ).toBe(1);
  });

  it('completes without payment as a pending income', async () => {
    const { body } = await schedule('2026-12-08T09:00:00-03:00').expect(201);
    const res = await http()
      .post(`/appointments/${body.id}/complete`)
      .set('Cookie', cookie)
      .send({})
      .expect(200);
    expect(res.body.transaction).toMatchObject({
      status: 'PENDING',
      paymentMethod: null,
      paidAt: null,
      amountCents: 20000,
    });

    await http()
      .post(`/appointments/${body.id}/complete`)
      .set('Cookie', cookie)
      .send({ paymentMethod: 'CHEQUE' })
      .expect(400);
  });

  it('marks a no-show and frees the time', async () => {
    const { body } = await schedule('2026-12-09T09:00:00-03:00').expect(201);
    await http()
      .post(`/appointments/${body.id}/no-show`)
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('NO_SHOW'));
    await schedule('2026-12-09T09:00:00-03:00').expect(201);
  });

  it('hides appointments of other clinics', async () => {
    const { body } = await schedule('2026-12-10T09:00:00-03:00').expect(201);
    await http()
      .get(`/appointments/${body.id}`)
      .set('Cookie', otherCookie)
      .expect(404);
    await http()
      .post(`/appointments/${body.id}/cancel`)
      .set('Cookie', otherCookie)
      .send({})
      .expect(404);
    await http()
      .post(`/appointments/${body.id}/complete`)
      .set('Cookie', otherCookie)
      .send({})
      .expect(404);
  });
});
