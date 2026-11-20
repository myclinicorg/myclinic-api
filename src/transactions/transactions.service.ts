import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicContext } from '../clinics/clinic-context.js';
import { startOfLocalDay, startOfNextLocalDay } from '../common/date-time.js';
import { pageArgs, toPage } from '../common/pagination.dto.js';
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

  async findAll({
    type,
    status,
    category,
    from,
    to,
    ...pagination
  }: FindTransactionsDto) {
    const where: Prisma.TransactionWhereInput = {
      ...this.periodWhere({ from, to }),
      type,
      status,
      category,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
        ...pageArgs(pagination),
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return toPage(data, total, pagination);
  }

  async summary({ from, to }: PeriodDto) {
    const clinicId = this.clinicContext.requireClinicId();
    const [paid, pending] = await this.prisma.$transaction([
      this.prisma.transaction.groupBy({
        by: ['type', 'category'],
        where: {
          clinicId,
          status: 'PAID',
          paidAt: {
            ...(from && { gte: startOfLocalDay(from) }),
            ...(to && { lt: startOfNextLocalDay(to) }),
          },
        },
        _sum: { amountCents: true },
        orderBy: [{ type: 'asc' }, { category: 'asc' }],
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { ...this.periodWhere({ from, to }), status: 'PENDING' },
        _sum: { amountCents: true },
        orderBy: { type: 'asc' },
      }),
    ]);

    const sum = (
      groups: {
        type: TransactionType;
        _sum?: { amountCents?: number | null };
      }[],
      type: TransactionType,
    ) =>
      groups
        .filter((g) => g.type === type)
        .reduce((total, g) => total + (g._sum?.amountCents ?? 0), 0);

    const incomeCents = sum(paid, 'INCOME');
    const expenseCents = sum(paid, 'EXPENSE');
    return {
      from: from ?? null,
      to: to ?? null,
      incomeCents,
      expenseCents,
      balanceCents: incomeCents - expenseCents,
      pendingIncomeCents: sum(pending, 'INCOME'),
      pendingExpenseCents: sum(pending, 'EXPENSE'),
      byCategory: paid.map((g) => ({
        type: g.type,
        category: g.category,
        totalCents: g._sum?.amountCents ?? 0,
      })),
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
