import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicContext } from '../clinics/clinic-context.js';
import { toLocalDate } from '../common/date-time.js';
import { PaginationDto, pageArgs, toPage } from '../common/pagination.dto.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto.js';
import { CreateSupplyDto } from './dto/create-supply.dto.js';
import { FindSuppliesDto } from './dto/find-supplies.dto.js';
import { UpdateSupplyDto } from './dto/update-supply.dto.js';

@Injectable()
export class SuppliesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicContext: ClinicContext,
  ) {}

  create(createSupplyDto: CreateSupplyDto) {
    return this.prisma.supply.create({
      data: Object.assign(
        { clinicId: this.clinicContext.requireClinicId() },
        createSupplyDto,
      ),
    });
  }

  async findAll({ active, lowStock, ...pagination }: FindSuppliesDto) {
    const where: Prisma.SupplyWhereInput = {
      clinicId: this.clinicContext.requireClinicId(),
      ...(active !== undefined && { active: active === 'true' }),
      ...(lowStock === 'true' && {
        currentQuantity: { lte: this.prisma.supply.fields.minQuantity },
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supply.findMany({
        where,
        orderBy: { name: 'asc' },
        ...pageArgs(pagination),
      }),
      this.prisma.supply.count({ where }),
    ]);
    return toPage(data, total, pagination);
  }

  async findOne(id: string) {
    const supply = await this.prisma.supply.findFirst({
      where: { id, clinicId: this.clinicContext.requireClinicId() },
    });
    if (!supply) {
      throw new NotFoundException('Item de estoque não encontrado');
    }
    return supply;
  }

  async update(id: string, updateSupplyDto: UpdateSupplyDto) {
    await this.findOne(id);
    return this.prisma.supply.update({
      where: { id },
      data: updateSupplyDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.supply.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Item possui movimentações; desative-o em vez de excluir',
        );
      }
      throw error;
    }
  }

  async findMovements(supplyId: string, pagination: PaginationDto) {
    await this.findOne(supplyId);
    const where: Prisma.StockMovementWhereInput = { supplyId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: { transaction: true },
        orderBy: { occurredAt: 'desc' },
        ...pageArgs(pagination),
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return toPage(data, total, pagination);
  }

  async addMovement(supplyId: string, dto: CreateStockMovementDto) {
    const clinicId = this.clinicContext.requireClinicId();
    const supply = await this.findOne(supplyId);
    const delta = signedQuantity(dto);
    const unitCostCents = dto.unitCostCents ?? supply.unitCostCents;

    if (dto.appointmentId && dto.type !== 'OUT') {
      throw new BadRequestException(
        'Somente saídas podem ser vinculadas a um agendamento',
      );
    }
    if (dto.registerExpense && dto.type !== 'IN') {
      throw new BadRequestException('Somente entradas podem gerar uma despesa');
    }
    if (dto.registerExpense && unitCostCents === null) {
      throw new BadRequestException(
        'Informe unitCostCents para registrar a despesa',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.appointmentId) {
        const appointment = await tx.appointment.findFirst({
          where: { id: dto.appointmentId, clinicId },
        });
        if (!appointment) {
          throw new BadRequestException('Agendamento não encontrado');
        }
      }

      const { count } = await tx.supply.updateMany({
        where: {
          id: supplyId,
          ...(delta < 0 && { currentQuantity: { gte: -delta } }),
        },
        data: {
          currentQuantity: { increment: delta },
          ...(dto.type === 'IN' &&
            dto.unitCostCents !== undefined && {
              unitCostCents: dto.unitCostCents,
            }),
        },
      });
      if (count === 0) {
        throw new ConflictException('Saldo insuficiente em estoque', {
          errorCode: 'INSUFFICIENT_STOCK',
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          clinicId,
          supplyId,
          type: dto.type,
          quantity: delta,
          unitCostCents,
          reason: dto.reason,
          appointmentId: dto.appointmentId,
          ...(dto.occurredAt && { occurredAt: new Date(dto.occurredAt) }),
        },
      });

      const transaction = dto.registerExpense
        ? await tx.transaction.create({
            data: {
              clinicId,
              type: 'EXPENSE',
              category: 'SUPPLIES',
              description: `Compra de ${supply.name}`,
              amountCents: Math.round(delta * (unitCostCents ?? 0)),
              status: dto.paymentMethod ? 'PAID' : 'PENDING',
              dueDate: toLocalDate(movement.occurredAt),
              paidAt: dto.paymentMethod ? new Date() : null,
              paymentMethod: dto.paymentMethod,
              stockMovementId: movement.id,
            },
          })
        : null;

      const updated = await tx.supply.findUniqueOrThrow({
        where: { id: supplyId },
      });
      return { ...movement, transaction, supply: updated };
    });
  }
}

function signedQuantity({ type, quantity }: CreateStockMovementDto) {
  if (type === 'ADJUSTMENT') {
    return quantity;
  }
  if (quantity < 0) {
    throw new BadRequestException(
      'quantity deve ser positiva para entradas e saídas',
    );
  }
  return type === 'IN' ? quantity : -quantity;
}
