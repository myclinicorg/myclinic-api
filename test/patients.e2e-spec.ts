import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '@nestjs/authentication';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Patients (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let otherCookie: string;
  let patientId: string;
  const patient = {
    fullName: 'Maria Souza',
    cpf: '12345678901',
    dateOfBirth: '1990-05-10',
    phone: '11912345678',
  };

  async function signUp(email: string, cnpj?: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({ name: 'Ana', email, password: 'correct horse battery' })
      .expect(201);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    if (cnpj) {
      await request(app.getHttpServer())
        .post('/clinic')
        .set('Cookie', cookie)
        .send({ name: 'Clínica', cnpj })
        .expect(201);
    }
    return cookie;
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

  it('requires a clinic', async () => {
    const noClinic = await signUp('caio@example.com');
    await request(app.getHttpServer())
      .get('/patients')
      .set('Cookie', noClinic)
      .expect(403);
  });

  it('creates a patient', async () => {
    const res = await request(app.getHttpServer())
      .post('/patients')
      .set('Cookie', cookie)
      .send(patient)
      .expect(201);
    expect(res.body).toMatchObject({
      fullName: patient.fullName,
      cpf: patient.cpf,
      dateOfBirth: '1990-05-10T00:00:00.000Z',
    });
    patientId = res.body.id;
  });

  it('rejects an invalid patient and a duplicate CPF', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .set('Cookie', cookie)
      .send({ fullName: '', cpf: '123', dateOfBirth: '10/05/1990' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/patients')
      .set('Cookie', cookie)
      .send(patient)
      .expect(409);
  });

  it('allows the same CPF in another clinic', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .set('Cookie', otherCookie)
      .send(patient)
      .expect(201);
  });

  it('lists and searches patients of the clinic', async () => {
    await request(app.getHttpServer())
      .post('/patients')
      .set('Cookie', cookie)
      .send({ fullName: 'João Lima', cpf: '98765432100' })
      .expect(201);

    const all = await request(app.getHttpServer())
      .get('/patients')
      .set('Cookie', cookie)
      .expect(200);
    expect(all.body.map((p: { fullName: string }) => p.fullName)).toEqual([
      'João Lima',
      'Maria Souza',
    ]);

    const byName = await request(app.getHttpServer())
      .get('/patients')
      .query({ search: 'maria' })
      .set('Cookie', cookie)
      .expect(200);
    expect(byName.body).toHaveLength(1);

    const byCpf = await request(app.getHttpServer())
      .get('/patients')
      .query({ search: '987.654' })
      .set('Cookie', cookie)
      .expect(200);
    expect(byCpf.body[0].fullName).toBe('João Lima');
  });

  it('reads, updates and deletes a patient', async () => {
    await request(app.getHttpServer())
      .get(`/patients/${patientId}`)
      .set('Cookie', cookie)
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Cookie', cookie)
      .send({ phone: null, dateOfBirth: null, notes: 'Alergia a dipirona' })
      .expect(200);
    expect(res.body).toMatchObject({
      phone: null,
      dateOfBirth: null,
      notes: 'Alergia a dipirona',
    });

    await request(app.getHttpServer())
      .patch(`/patients/${patientId}`)
      .set('Cookie', cookie)
      .send({ cpf: null })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/patients/${patientId}`)
      .set('Cookie', cookie)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/patients/${patientId}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('hides patients of other clinics', async () => {
    const res = await request(app.getHttpServer())
      .get('/patients')
      .set('Cookie', otherCookie)
      .expect(200);
    const [own] = res.body;

    await request(app.getHttpServer())
      .get(`/patients/${own.id}`)
      .set('Cookie', cookie)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/patients/${own.id}`)
      .set('Cookie', cookie)
      .send({ fullName: 'Invasor' })
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/patients/${own.id}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('rejects an invalid id', async () => {
    await request(app.getHttpServer())
      .get('/patients/not-a-uuid')
      .set('Cookie', cookie)
      .expect(400);
  });
});
