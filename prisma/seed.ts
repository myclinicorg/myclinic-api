import 'dotenv/config';
import { PasswordHasher } from '@nestjs/authentication';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;
  if (!email || !password) {
    throw new Error('Defina DEMO_EMAIL e DEMO_PASSWORD no .env');
  }

  const passwordHash = await new PasswordHasher().hash(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { name: 'Conta Demo', email, passwordHash, emailVerified: true },
  });

  const clinic = await prisma.clinic.upsert({
    where: { ownerId: user.id },
    update: {},
    create: {
      ownerId: user.id,
      name: 'Clínica Demo',
      cnpj: '11222333000181',
      phone: '11987654321',
      contactEmail: email,
      city: 'São Paulo',
      state: 'SP',
      openingTime: '08:00',
      closingTime: '18:00',
      workingDays: [1, 2, 3, 4, 5],
    },
  });

  const patients = [
    { fullName: 'Maria Souza', cpf: '52998224725', phone: '11912345678' },
    { fullName: 'João Lima', cpf: '12345678909', phone: '11923456789' },
    { fullName: 'Ana Pereira', cpf: '98765432100', phone: '11934567890' },
  ];
  for (const patient of patients) {
    await prisma.patient.upsert({
      where: { clinicId_cpf: { clinicId: clinic.id, cpf: patient.cpf } },
      update: {},
      create: { ...patient, clinicId: clinic.id },
    });
  }

  if ((await prisma.service.count({ where: { clinicId: clinic.id } })) === 0) {
    await prisma.service.createMany({
      data: [
        {
          clinicId: clinic.id,
          name: 'Consulta',
          priceCents: 15000,
          durationMinutes: 50,
        },
        {
          clinicId: clinic.id,
          name: 'Retorno',
          priceCents: 8000,
          durationMinutes: 30,
        },
      ],
    });
  }

  console.log(`Conta demo pronta: ${email} (clínica "${clinic.name}")`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
