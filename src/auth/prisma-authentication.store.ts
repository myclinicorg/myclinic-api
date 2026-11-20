import { Injectable } from '@nestjs/common';
import {
  AuthenticationStorage,
  type EmailTokenPurpose,
  type EmailTokenRecord,
  type EmailTokenStore,
  type MfaState,
  type SessionRecord,
  type SessionStore,
} from '@nestjs/authentication';
import {
  Prisma,
  type EmailToken,
  type Session,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PrismaAuthenticationStore
  implements SessionStore, EmailTokenStore
{
  protected readonly maxPending: number = 100_000;

  constructor(
    private readonly prisma: PrismaService,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ sessions: this, emailTokens: this });
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const row = await this.prisma.session.findUnique({ where: { id } });
    return row ? toSessionRecord(row) : undefined;
  }

  async createSession({
    id,
    userId,
    createdAt,
    expiresAt,
    lastActiveAt,
    mfa,
    metadata,
  }: SessionRecord): Promise<void> {
    await this.prisma.session.create({
      data: {
        id,
        userId,
        createdAt,
        expiresAt,
        lastActiveAt,
        mfa,
        metadata: metadata as Prisma.InputJsonObject | undefined,
      },
    });
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lte: createdAt } },
    });
  }

  async touchSession(id: string, lastActiveAt: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id, lastActiveAt: { lt: lastActiveAt } },
      data: { lastActiveAt },
    });
  }

  async deleteSession(id: string): Promise<boolean> {
    const { count } = await this.prisma.session.deleteMany({ where: { id } });
    return count > 0;
  }

  async listUserSessions(userId: string): Promise<SessionRecord[]> {
    const rows = await this.prisma.session.findMany({ where: { userId } });
    return rows.map(toSessionRecord);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async saveEmailToken(record: EmailTokenRecord): Promise<void> {
    await this.prisma.emailToken.create({ data: record });
    await this.trimEmailTokens(record.createdAt);
  }

  async consumeEmailToken(
    id: string,
    purpose: EmailTokenPurpose,
  ): Promise<EmailTokenRecord | undefined> {
    try {
      const row = await this.prisma.emailToken.delete({
        where: { id, purpose },
      });
      return toEmailTokenRecord(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return undefined;
      }
      throw error;
    }
  }

  async deleteUserEmailTokens(
    userId: string,
    purpose: EmailTokenPurpose,
  ): Promise<void> {
    await this.prisma.emailToken.deleteMany({ where: { userId, purpose } });
  }

  private async trimEmailTokens(now: Date) {
    await this.prisma.emailToken.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    const cutoff = await this.prisma.emailToken.findFirst({
      select: { expiresAt: true },
      orderBy: { expiresAt: 'desc' },
      skip: this.maxPending,
    });
    if (cutoff) {
      await this.prisma.emailToken.deleteMany({
        where: { expiresAt: { lte: cutoff.expiresAt } },
      });
    }
  }
}

function toSessionRecord({
  mfa,
  metadata,
  ...session
}: Session): SessionRecord {
  return {
    ...session,
    ...(mfa !== null && { mfa: mfa as MfaState }),
    ...(metadata !== null && {
      metadata: metadata as Record<string, unknown>,
    }),
  };
}

function toEmailTokenRecord({
  purpose,
  fingerprint,
  ...token
}: EmailToken): EmailTokenRecord {
  return {
    ...token,
    purpose: purpose as EmailTokenPurpose,
    ...(fingerprint !== null && { fingerprint }),
  };
}
