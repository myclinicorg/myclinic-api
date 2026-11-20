import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '@nestjs/authentication';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Supplies (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let otherCookie: string;
  let supplyId: string;

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

  function move(body: object, id = supplyId, as = cookie) {
    return http()
      .post(`/supplies/${id}/movements`)
      .set('Cookie', as)
      .send(body);
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
    cookie = await signUp('ana@example.com', '12345678000195');
    otherCookie = await signUp('bia@example.com', '98765432000198');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a supply with zero balance', async () => {
    const res = await http()
      .post('/supplies')
      .set('Cookie', cookie)
      .send({ name: 'Luva descartável', unit: 'cx', minQuantity: 2 })
      .expect(201);
    expect(res.body).toMatchObject({
      name: 'Luva descartável',
      currentQuantity: '0',
      minQuantity: '2',
      active: true,
    });
    supplyId = res.body.id;

    await http()
      .post('/supplies')
      .set('Cookie', cookie)
      .send({ name: '', unit: 'cx', minQuantity: 1.2345 })
      .expect(400);
  });

  it('records an entry with a paid expense', async () => {
    const res = await move({
      type: 'IN',
      quantity: 10,
      unitCostCents: 2550,
      registerExpense: true,
      paymentMethod: 'PIX',
    }).expect(201);
    expect(res.body).toMatchObject({
      type: 'IN',
      quantity: '10',
      unitCostCents: 2550,
      supply: { currentQuantity: '10', unitCostCents: 2550 },
      transaction: {
        type: 'EXPENSE',
        category: 'SUPPLIES',
        amountCents: 25500,
        status: 'PAID',
        paymentMethod: 'PIX',
      },
    });
  });

  it('records exits and adjustments without going negative', async () => {
    const out = await move({ type: 'OUT', quantity: 2.5 }).expect(201);
    expect(out.body).toMatchObject({
      quantity: '-2.5',
      supply: { currentQuantity: '7.5' },
    });

    const res = await move({ type: 'OUT', quantity: 8 }).expect(409);
    expect(res.body.errorCode).toBe('INSUFFICIENT_STOCK');

    const adjusted = await move({
      type: 'ADJUSTMENT',
      quantity: -2.5,
      reason: 'Inventário',
    }).expect(201);
    expect(adjusted.body.supply.currentQuantity).toBe('5');

    await move({ type: 'OUT', quantity: -1 }).expect(400);
    await move({ type: 'IN', quantity: 0 }).expect(400);
    await move({ type: 'OUT', quantity: 1, registerExpense: true }).expect(400);
  });

  it('never lets concurrent exits overdraw the balance', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => move({ type: 'OUT', quantity: 1 })),
    );
    expect(responses.filter((r) => r.status === 201)).toHaveLength(5);
    expect(responses.filter((r) => r.status === 409)).toHaveLength(5);

    const supply = await http()
      .get(`/supplies/${supplyId}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(supply.body.currentQuantity).toBe('0');
  });

  it('lists movements and low-stock supplies', async () => {
    const movements = await http()
      .get(`/supplies/${supplyId}/movements`)
      .set('Cookie', cookie)
      .expect(200);
    expect(movements.body.data).toHaveLength(8);

    await http()
      .post('/supplies')
      .set('Cookie', cookie)
      .send({ name: 'Algodão', unit: 'pct' })
      .expect(201);
    const low = await http()
      .get('/supplies')
      .query({ lowStock: 'true' })
      .set('Cookie', cookie)
      .expect(200);
    expect(low.body.data.map((s: { name: string }) => s.name)).toEqual([
      'Algodão',
      'Luva descartável',
    ]);
  });

  it('links an exit to an appointment of the clinic only', async () => {
    await move({ type: 'IN', quantity: 3 }).expect(201);
    const patient = await http()
      .post('/patients')
      .set('Cookie', cookie)
      .send({ fullName: 'Maria', cpf: '12345678909' })
      .expect(201);
    const service = await http()
      .post('/services')
      .set('Cookie', cookie)
      .send({ name: 'Curativo', priceCents: 5000, durationMinutes: 30 })
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
    const linked = await move({
      type: 'OUT',
      quantity: 1,
      appointmentId: appointment.body.id,
    }).expect(201);
    expect(linked.body.appointmentId).toBe(appointment.body.id);

    await move({
      type: 'OUT',
      quantity: 1,
      appointmentId: '00000000-0000-4000-8000-000000000000',
    }).expect(400);
    await move({
      type: 'IN',
      quantity: 1,
      appointmentId: '00000000-0000-4000-8000-000000000000',
    }).expect(400);
  });

  it('refuses to delete a supply with movements', async () => {
    await http()
      .delete(`/supplies/${supplyId}`)
      .set('Cookie', cookie)
      .expect(409);
    await http()
      .patch(`/supplies/${supplyId}`)
      .set('Cookie', cookie)
      .send({ active: false })
      .expect(200);
  });

  it('hides supplies of other clinics', async () => {
    await http()
      .get(`/supplies/${supplyId}`)
      .set('Cookie', otherCookie)
      .expect(404);
    await move({ type: 'IN', quantity: 1 }, supplyId, otherCookie).expect(404);
    await http()
      .get(`/supplies/${supplyId}/movements`)
      .set('Cookie', otherCookie)
      .expect(404);
  });
});
