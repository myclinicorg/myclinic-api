import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { AuthenticationContext } from '@nestjs/authentication';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClinicContext } from './clinic-context.js';
import { CreateClinicDto } from './dto/create-clinic.dto.js';
import { UpdateClinicDto } from './dto/update-clinic.dto.js';

@Injectable()
export class ClinicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authenticationContext: AuthenticationContext,
    private readonly clinicContext: ClinicContext,
  ) {}

  async create(createClinicDto: CreateClinicDto) {
    const user = this.authenticationContext.requireUser();
    if (user.clinicId) {
      throw new ConflictException('Você já possui uma clínica cadastrada');
    }
    assertBusinessHours(
      createClinicDto.openingTime,
      createClinicDto.closingTime,
    );
    try {
      return await this.prisma.clinic.create({
        data: Object.assign({ ownerId: user.id }, createClinicDto),
      });
    } catch (error) {
      throw toConflict(error);
    }
  }

  findMine() {
    return this.prisma.clinic.findUniqueOrThrow({
      where: { id: this.clinicContext.requireClinicId() },
    });
  }

  async update(updateClinicDto: UpdateClinicDto) {
    const current = await this.findMine();
    assertBusinessHours(
      updateClinicDto.openingTime === undefined
        ? current.openingTime
        : updateClinicDto.openingTime,
      updateClinicDto.closingTime === undefined
        ? current.closingTime
        : updateClinicDto.closingTime,
    );
    try {
      return await this.prisma.clinic.update({
        where: { id: this.clinicContext.requireClinicId() },
        data: updateClinicDto,
      });
    } catch (error) {
      throw toConflict(error);
    }
  }
}

function assertBusinessHours(
  openingTime?: string | null,
  closingTime?: string | null,
) {
  if (!openingTime !== !closingTime) {
    throw new BadRequestException('Informe openingTime e closingTime juntos');
  }
  if (openingTime && closingTime && openingTime >= closingTime) {
    throw new BadRequestException(
      'openingTime deve ser anterior a closingTime',
    );
  }
}

function toConflict(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = JSON.stringify(error.meta ?? {});
    return new ConflictException(
      target.includes('owner')
        ? 'Você já possui uma clínica cadastrada'
        : 'CNPJ já cadastrado',
    );
  }
  return error;
}
