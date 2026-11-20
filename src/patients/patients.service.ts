import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicContext } from '../clinics/clinic-context.js';
import { pageArgs, toPage } from '../common/pagination.dto.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { FindPatientsDto } from './dto/find-patients.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicContext: ClinicContext,
  ) {}

  async create(createPatientDto: CreatePatientDto) {
    const clinicId = this.clinicContext.requireClinicId();
    try {
      return await this.prisma.patient.create({
        data: Object.assign(toData(createPatientDto), { clinicId }),
      });
    } catch (error) {
      throw toHttpError(error);
    }
  }

  async findAll({ search, ...pagination }: FindPatientsDto) {
    const clinicId = this.clinicContext.requireClinicId();
    const term = search?.trim();
    const digits = term?.replace(/\D/g, '');
    const where: Prisma.PatientWhereInput = {
      clinicId,
      ...(term && {
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          ...(digits ? [{ cpf: { startsWith: digits } }] : []),
        ],
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        orderBy: { fullName: 'asc' },
        ...pageArgs(pagination),
      }),
      this.prisma.patient.count({ where }),
    ]);
    return toPage(data, total, pagination);
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, clinicId: this.clinicContext.requireClinicId() },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }
    return patient;
  }

  async update(id: string, updatePatientDto: UpdatePatientDto) {
    await this.findOne(id);
    try {
      return await this.prisma.patient.update({
        where: { id },
        data: toData(updatePatientDto),
      });
    } catch (error) {
      throw toHttpError(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.patient.delete({ where: { id } });
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

function toData<T extends { dateOfBirth?: string | null }>(dto: T) {
  const { dateOfBirth, ...data } = Object.assign({}, dto);
  return {
    ...data,
    ...(dateOfBirth !== undefined && {
      dateOfBirth: dateOfBirth === null ? null : new Date(dateOfBirth),
    }),
  };
}

function toHttpError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new ConflictException('CPF já cadastrado');
    }
    if (error.code === 'P2003') {
      return new ConflictException(
        'Paciente possui agendamentos e não pode ser excluído',
      );
    }
  }
  return error;
}
