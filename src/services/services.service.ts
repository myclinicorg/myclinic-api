import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicContext } from '../clinics/clinic-context.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateServiceDto } from './dto/create-service.dto.js';
import { FindServicesDto } from './dto/find-services.dto.js';
import { UpdateServiceDto } from './dto/update-service.dto.js';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicContext: ClinicContext,
  ) {}

  create(createServiceDto: CreateServiceDto) {
    return this.prisma.service.create({
      data: Object.assign(
        { clinicId: this.clinicContext.requireClinicId() },
        createServiceDto,
      ),
    });
  }

  findAll({ active }: FindServicesDto) {
    return this.prisma.service.findMany({
      where: {
        clinicId: this.clinicContext.requireClinicId(),
        ...(active !== undefined && { active: active === 'true' }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, clinicId: this.clinicContext.requireClinicId() },
    });
    if (!service) {
      throw new NotFoundException('Serviço não encontrado');
    }
    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    await this.findOne(id);
    return this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    try {
      await this.prisma.service.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Serviço possui agendamentos; desative-o em vez de excluir',
        );
      }
      throw error;
    }
  }
}
