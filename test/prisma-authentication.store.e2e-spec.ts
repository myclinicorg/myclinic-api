import { AuthenticationStorage } from '@nestjs/authentication';
import { authenticationStoreContract } from '@nestjs/authentication/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaAuthenticationStore } from '../src/auth/prisma-authentication.store.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

class CappedStore extends PrismaAuthenticationStore {
  protected override readonly maxPending = 3;
}

describe('PrismaAuthenticationStore', () => {
  const prisma = new PrismaService(new ConfigService());

  afterAll(() => prisma.$disconnect());

  async function emptyStore() {
    await prisma.$executeRaw`TRUNCATE sessions, email_tokens`;
    const store = new CappedStore(prisma, new AuthenticationStorage());
    return { sessions: store, emailTokens: store };
  }

  for (const c of authenticationStoreContract(emptyStore, {
    contracts: ['sessions', 'emailTokens'],
    concurrent: true,
    maxPending: 3,
  })) {
    it(c.name, () => c.run());
  }
});
