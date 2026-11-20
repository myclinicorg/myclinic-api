import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicContext } from '../clinics/clinic-context.js';
import {
  Prisma,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { FindTransactionsDto, PeriodDto } from './dto/find-transactions.dto.js';
import { PayTransactionDto } from './dto/pay-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';

const CATEGORIES: Record<TransactionType, TransactionCategory[]> = {
  INCOME: ['SERVICE', 'PRODUCT_SALE', 'OTHER'],
  EXPENSE: [
    'SUPPLIES',
    'RENT',
    'UTILITIES',
    'TAXES',
    'EQUIPMENT',
    'MARKETING',
    'OTHER',
  ],
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicContext: ClinicContext,
  ) {}

  create(createTransactionDto: CreateTransactionDto) {
    const { type, category, description, amountCents, dueDate, paymentMethod } =
      createTransactionDto;
    assertCategory(type, category);
    return this.prisma.transaction.create({
      data: {
        clinicId: this.clinicContext.requireClinicId(),
        type,
        category,
        description,
        amountCents,
        dueDate: new Date(dueDate),
        status: paymentMethod ? 'PAID' : 'PENDING',
        paymentMethod,
        paidAt: paymentMethod ? new Date() : null,
      },
    });
  }

  findAll({ type, status, category, ...period }: FindTransactionsDto) {
    return this.prisma.transaction.findMany({
      where: { ...this.periodWhere(period), type, status, category },
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async summary(period: PeriodDto) {
    const groups = await this.prisma.transaction.groupBy({
      by: ['type', 'status', 'category'],
      where: {
        ...this.periodWhere(period),
        status: { not: 'CANCELED' },
      },
      _sum: { amountCents: true },
    });

    const total = (type: TransactionType, status: TransactionStatus) =>
      groups
        .filter((g) => g.type === type && g.status === status)
        .reduce((sum, g) => sum + (g._sum.amountCents ?? 0), 0);

    const incomeCents = total('INCOME', 'PAID');
    const expenseCents = total('EXPENSE', 'PAID');
    const byCategory = new Map<string, number>();
    for (const g of groups.filter((g) => g.status === 'PAID')) {
      const key = `${g.type}:${g.category}`;
      byCategory.set(
        key,
        (byCategory.get(key) ?? 0) + (g._sum.amountCents ?? 0),
      );
    }

    return {
      from: period.from ?? null,
      to: period.to ?? null,
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
      pendingIncomeCents: total('INCOME', 'PENDING'),
      pendingExpenseCents: total('EXPENSE', 'PENDING'),
      byCategory: [...byCategory].map(([key, totalCents]) => {
        const [type, category] = key.split(':');
        return { type, category, totalCents };
      }),
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, clinicId: this.clinicContext.requireClinicId() },
    });
    if (!transaction) {
      throw new NotFoundException('Lançamento não encontrado');
    }
    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    const current = await this.findOne(id);
    const { dueDate, ...data } = Object.assign({}, updateTransactionDto);
    if (data.category) {
      assertCategory(current.type, data.category);
    }
    const { count } = await this.prisma.transaction.updateMany({
      where: { id, status: { not: 'CANCELED' } },
      data: { ...data, ...(dueDate && { dueDate: new Date(dueDate) }) },
    });
    if (count === 0) {
      throw invalidStatus();
    }
    return this.findOne(id);
  }

  pay(id: string, { paymentMethod }: PayTransactionDto) {
    return this.transition(id, ['PENDING'], {
      status: 'PAID',
      paymentMethod,
      paidAt: new Date(),
    });
  }

  cancel(id: string) {
    return this.transition(id, ['PENDING', 'PAID'], { status: 'CANCELED' });
  }

  private periodWhere({ from, to }: PeriodDto): Prisma.TransactionWhereInput {
    return {
      clinicId: this.clinicContext.requireClinicId(),
      dueDate: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    };
  }

  private async transition(
    id: string,
    from: TransactionStatus[],
    data: Prisma.TransactionUpdateManyMutationInput,
  ) {
    const { count } = await this.prisma.transaction.updateMany({
      where: {
        id,
        clinicId: this.clinicContext.requireClinicId(),
        status: { in: from },
      },
      data,
    });
    const transaction = await this.findOne(id);
    if (count === 0) {
      throw invalidStatus();
    }
    return transaction;
  }
}

function assertCategory(type: TransactionType, category: TransactionCategory) {
  if (!CATEGORIES[type].includes(category)) {
    throw new BadRequestException(
      `Categoria ${category} não se aplica a lançamentos do tipo ${type}`,
    );
  }
}

function invalidStatus() {
  return new ConflictException(
    'Ação não permitida para o status atual do lançamento',
    { errorCode: 'INVALID_STATUS' },
  );
}
