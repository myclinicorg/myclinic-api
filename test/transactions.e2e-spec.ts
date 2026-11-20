import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '@nestjs/authentication';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let otherCookie: string;
  let rentId: string;

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

  function create(body: object, as = cookie) {
    return http().post('/transactions').set('Cookie', as).send(body);
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
    cookie = await signUp('ana@example.com', '12345678000190');
    otherCookie = await signUp('bia@example.com', '98765432000110');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates pending and paid transactions', async () => {
    const rent = await create({
      type: 'EXPENSE',
      category: 'RENT',
      description: 'Aluguel de dezembro',
      amountCents: 120000,
      dueDate: '2030-01-05',
    }).expect(201);
    expect(rent.body).toMatchObject({
      status: 'PENDING',
      paidAt: null,
      dueDate: '2030-01-05T00:00:00.000Z',
    });
    rentId = rent.body.id;

    const sale = await create({
      type: 'INCOME',
      category: 'PRODUCT_SALE',
      amountCents: 4500,
      dueDate: '2030-01-02',
      paymentMethod: 'CASH',
    }).expect(201);
    expect(sale.body).toMatchObject({ status: 'PAID', paymentMethod: 'CASH' });
    expect(sale.body.paidAt).toEqual(expect.any(String));
  });

  it('validates the transaction', async () => {
    await create({
      type: 'INCOME',
      category: 'RENT',
      amountCents: 100,
      dueDate: '2026-12-01',
    }).expect(400);
    await create({
      type: 'EXPENSE',
      category: 'RENT',
      amountCents: 0,
      dueDate: '01/12/2026',
    }).expect(400);
  });

  it('pays and cancels transactions', async () => {
    const paid = await http()
      .post(`/transactions/${rentId}/pay`)
      .set('Cookie', cookie)
      .send({ paymentMethod: 'BANK_TRANSFER' })
      .expect(200);
    expect(paid.body).toMatchObject({
      status: 'PAID',
      paymentMethod: 'BANK_TRANSFER',
    });

    const again = await http()
      .post(`/transactions/${rentId}/pay`)
      .set('Cookie', cookie)
      .send({ paymentMethod: 'PIX' })
      .expect(409);
    expect(again.body.errorCode).toBe('INVALID_STATUS');

    const tax = await create({
      type: 'EXPENSE',
      category: 'TAXES',
      amountCents: 7600,
      dueDate: '2030-01-20',
    }).expect(201);
    await http()
      .post(`/transactions/${tax.body.id}/cancel`)
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => expect(res.body.status).toBe('CANCELED'));
    await http()
      .patch(`/transactions/${tax.body.id}`)
      .set('Cookie', cookie)
      .send({ amountCents: 8000 })
      .expect(409);
  });

  it('updates a transaction', async () => {
    const res = await http()
      .patch(`/transactions/${rentId}`)
      .set('Cookie', cookie)
      .send({ description: 'Aluguel sala 2', category: 'UTILITIES' })
      .expect(200);
    expect(res.body).toMatchObject({
      description: 'Aluguel sala 2',
      category: 'UTILITIES',
    });
    await http()
      .patch(`/transactions/${rentId}`)
      .set('Cookie', cookie)
      .send({ category: 'SERVICE' })
      .expect(400);
    await http()
      .patch(`/transactions/${rentId}`)
      .set('Cookie', cookie)
      .send({ type: 'INCOME' })
      .expect(200)
      .expect((r) => expect(r.body.type).toBe('EXPENSE'));
  });

  it('includes income from completed appointments', async () => {
    const patient = await http()
      .post('/patients')
      .set('Cookie', cookie)
      .send({ fullName: 'Maria', cpf: '12345678901' })
      .expect(201);
    const service = await http()
      .post('/services')
      .set('Cookie', cookie)
      .send({ name: 'Consulta', priceCents: 15000, durationMinutes: 50 })
      .expect(201);
    const appointment = await http()
      .post('/appointments')
      .set('Cookie', cookie)
      .send({
        patientId: patient.body.id,
        serviceId: service.body.id,
        startsAt: '2026-12-01T10:00:00-03:00',
      })
      .expect(201);
    const done = await http()
      .post(`/appointments/${appointment.body.id}/complete`)
      .set('Cookie', cookie)
      .send({})
      .expect(200);

    const pending = await http()
      .get('/transactions')
      .query({ type: 'INCOME', status: 'PENDING' })
      .set('Cookie', cookie)
      .expect(200);
    expect(pending.body).toHaveLength(1);
    expect(pending.body[0].appointmentId).toBe(appointment.body.id);

    await http()
      .post(`/transactions/${done.body.transaction.id}/pay`)
      .set('Cookie', cookie)
      .send({ paymentMethod: 'PIX' })
      .expect(200);
  });

  it('summarizes the period', async () => {
    const res = await http()
      .get('/transactions/summary')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body).toMatchObject({
      incomeCents: 19500,
      expenseCents: 120000,
      balanceCents: -100500,
      pendingIncomeCents: 0,
      pendingExpenseCents: 0,
    });
    expect(res.body.byCategory).toEqual(
      expect.arrayContaining([
        { type: 'INCOME', category: 'SERVICE', totalCents: 15000 },
        { type: 'INCOME', category: 'PRODUCT_SALE', totalCents: 4500 },
        { type: 'EXPENSE', category: 'UTILITIES', totalCents: 120000 },
      ]),
    );

    const january = await http()
      .get('/transactions/summary')
      .query({ from: '2030-01-01', to: '2030-01-03' })
      .set('Cookie', cookie)
      .expect(200);
    expect(january.body).toMatchObject({
      incomeCents: 4500,
      expenseCents: 0,
    });
  });

  it('lists by period and hides other clinics', async () => {
    const res = await http()
      .get('/transactions')
      .query({ from: '2030-01-04', to: '2030-01-31' })
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.map((t: { dueDate: string }) => t.dueDate)).toEqual([
      '2030-01-20T00:00:00.000Z',
      '2030-01-05T00:00:00.000Z',
    ]);

    await http()
      .get(`/transactions/${rentId}`)
      .set('Cookie', otherCookie)
      .expect(404);
    const other = await http()
      .get('/transactions/summary')
      .set('Cookie', otherCookie)
      .expect(200);
    expect(other.body.incomeCents).toBe(0);
  });
});
