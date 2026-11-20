import { Injectable } from '@nestjs/common';
import type { User as UserRow } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { User } from './user.js';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    { name, email }: { name: string; email: string },
    {
      passwordHash = null,
      emailVerified = false,
    }: { passwordHash?: string | null; emailVerified?: boolean } = {},
  ): Promise<User> {
    const row = await this.prisma.user.create({
      data: { name, email: normalize(email), emailVerified, passwordHash },
    });
    return toUser(row);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.findRow(email);
    return row ? toUser(row) : null;
  }

  async findCredentials(
    email: string,
  ): Promise<{ user: User; passwordHash: string | null } | null> {
    const row = await this.findRow(email);
    return row ? { user: toUser(row), passwordHash: row.passwordHash } : null;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id },
      data: { passwordHash },
    });
  }

  private findRow(email: string) {
    return this.prisma.user.findUnique({ where: { email: normalize(email) } });
  }
}

const normalize = (email: string) =>
  email.trim().normalize('NFC').toLowerCase();
const toUser = ({ id, name, email, emailVerified }: UserRow): User => ({
  id,
  name,
  email,
  emailVerified,
});
