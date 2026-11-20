import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicContext } from '../clinics/clinic-context.js';
import { minutesOfDay, toLocalDate, toLocalTime } from '../common/date-time.js';
import { pageArgs, toPage } from '../common/pagination.dto.js';
import { AppointmentStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';
import { CompleteAppointmentDto } from './dto/complete-appointment.dto.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { FindAppointmentsDto } from './dto/find-appointments.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';

const OPEN: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED'];
const FREEING: AppointmentStatus[] = ['CANCELED', 'NO_SHOW'];

const details = {
  patient: { select: { id: true, fullName: true } },
  service: { select: { id: true, name: true } },
} satisfies Prisma.AppointmentInclude;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicContext: ClinicContext,
  ) {}

  create(createAppointmentDto: CreateAppointmentDto) {
    const clinicId = this.clinicContext.requireClinicId();
    const { patientId, serviceId, notes } = createAppointmentDto;
    const startsAt = new Date(createAppointmentDto.startsAt);
    assertFuture(startsAt);

    return this.prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id: patientId, clinicId },
      });
      if (!patient) {
        throw new BadRequestException('Paciente não encontrado');
      }
      const service = await tx.service.findFirst({
        where: { id: serviceId, clinicId, active: true },
      });
      if (!service) {
        throw new BadRequestException('Serviço não encontrado ou inativo');
      }
      const endsAt = addMinutes(startsAt, service.durationMinutes);
      await assertBusinessHours(tx, clinicId, startsAt, endsAt);
      await assertAvailable(tx, clinicId, startsAt, endsAt);
      return tx.appointment.create({
        data: {
          clinicId,
          patientId,
          serviceId,
          startsAt,
          endsAt,
          priceCents: service.priceCents,
          notes,
        },
        include: details,
      });
    });
  }

  async findAll({
    from,
    to,
    status,
    patientId,
    ...pagination
  }: FindAppointmentsDto) {
    const where: Prisma.AppointmentWhereInput = {
      clinicId: this.clinicContext.requireClinicId(),
      status,
      patientId,
      startsAt: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lt: new Date(to) }),
      },
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        include: details,
        orderBy: { startsAt: 'asc' },
        ...pageArgs(pagination),
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return toPage(data, total, pagination);
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, clinicId: this.clinicContext.requireClinicId() },
      include: { ...details, transaction: true },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    return appointment;
  }

  async update(id: string, { startsAt, notes }: UpdateAppointmentDto) {
    const clinicId = this.clinicContext.requireClinicId();
    if (startsAt === undefined) {
      await this.findOne(id);
      return this.prisma.appointment.update({
        where: { id },
        data: { notes },
        include: details,
      });
    }

    const newStartsAt = new Date(startsAt);
    assertFuture(newStartsAt);

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.appointment.findFirst({
        where: { id, clinicId },
      });
      if (!current) {
        throw new NotFoundException('Agendamento não encontrado');
      }
      const newEndsAt = new Date(
        newStartsAt.getTime() +
          (current.endsAt.getTime() - current.startsAt.getTime()),
      );
      await assertBusinessHours(tx, clinicId, newStartsAt, newEndsAt);
      await assertAvailable(tx, clinicId, newStartsAt, newEndsAt, id);
      const { count } = await tx.appointment.updateMany({
        where: { id, status: { in: OPEN } },
        data: {
          startsAt: newStartsAt,
          endsAt: newEndsAt,
          status: 'SCHEDULED',
          notes,
        },
      });
      if (count === 0) {
        throw invalidTransition();
      }
      return tx.appointment.findUniqueOrThrow({
        where: { id },
        include: details,
      });
    });
  }

  confirm(id: string) {
    return this.transition(id, ['SCHEDULED'], { status: 'CONFIRMED' });
  }

  cancel(id: string, { reason }: CancelAppointmentDto) {
    return this.transition(id, OPEN, {
      status: 'CANCELED',
      canceledAt: new Date(),
      cancelReason: reason,
    });
  }

  markNoShow(id: string) {
    return this.transition(id, OPEN, { status: 'NO_SHOW' });
  }

  complete(id: string, { paymentMethod }: CompleteAppointmentDto) {
    const clinicId = this.clinicContext.requireClinicId();
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.appointment.updateMany({
        where: { id, clinicId, status: { in: OPEN } },
        data: { status: 'COMPLETED', completedAt: now },
      });
      if (count === 0) {
        await this.findOne(id);
        throw invalidTransition();
      }
      const appointment = await tx.appointment.findUniqueOrThrow({
        where: { id },
        include: details,
      });
      const transaction = await tx.transaction.create({
        data: {
          clinicId,
          type: 'INCOME',
          category: 'SERVICE',
          description: `${appointment.service.name} - ${appointment.patient.fullName}`,
          amountCents: appointment.priceCents,
          status: paymentMethod ? 'PAID' : 'PENDING',
          dueDate: toLocalDate(now),
          paidAt: paymentMethod ? now : null,
          paymentMethod,
          appointmentId: id,
        },
      });
      return { ...appointment, transaction };
    });
  }

  private async transition(
    id: string,
    from: AppointmentStatus[],
    data: Prisma.AppointmentUpdateManyMutationInput,
  ) {
    const { count } = await this.prisma.appointment.updateMany({
      where: {
        id,
        clinicId: this.clinicContext.requireClinicId(),
        status: { in: from },
      },
      data,
    });
    const appointment = await this.findOne(id);
    if (count === 0) {
      throw invalidTransition();
    }
    return appointment;
  }
}

async function assertAvailable(
  tx: Prisma.TransactionClient,
  clinicId: string,
  startsAt: Date,
  endsAt: Date,
  ignoreId?: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${clinicId}))`;
  const conflict = await tx.appointment.findFirst({
    where: {
      clinicId,
      status: { notIn: FREEING },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(ignoreId && { id: { not: ignoreId } }),
    },
  });
  if (conflict) {
    throw new ConflictException('Horário indisponível', {
      errorCode: 'SCHEDULE_CONFLICT',
    });
  }
}

function assertFuture(startsAt: Date) {
  if (startsAt.getTime() <= Date.now()) {
    throw new BadRequestException('Não é possível agendar no passado', {
      errorCode: 'PAST_DATE',
    });
  }
}

async function assertBusinessHours(
  tx: Prisma.TransactionClient,
  clinicId: string,
  startsAt: Date,
  endsAt: Date,
) {
  const { openingTime, closingTime, workingDays } =
    await tx.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  const start = toLocalTime(startsAt);
  const end = toLocalTime(endsAt);
  const outsideDays =
    workingDays.length > 0 && !workingDays.includes(start.weekday);
  const outsideHours =
    openingTime &&
    closingTime &&
    (start.weekday !== end.weekday ||
      start.minutes < minutesOfDay(openingTime) ||
      end.minutes > minutesOfDay(closingTime));
  if (outsideDays || outsideHours) {
    throw new BadRequestException('Horário fora do expediente da clínica', {
      errorCode: 'OUTSIDE_BUSINESS_HOURS',
    });
  }
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function invalidTransition() {
  return new ConflictException(
    'Ação não permitida para o status atual do agendamento',
    { errorCode: 'INVALID_STATUS' },
  );
}
