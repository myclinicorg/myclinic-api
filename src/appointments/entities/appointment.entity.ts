import { ApiProperty } from '@nestjs/swagger';
import { PageMetaEntity } from '../../common/page-meta.entity.js';
import { AppointmentStatus } from '../../generated/prisma/client.js';
import { TransactionEntity } from '../../transactions/entities/transaction.entity.js';

export class AppointmentPatientEntity {
  id: string;
  fullName: string;
}

export class AppointmentServiceEntity {
  id: string;
  name: string;
}

export class AppointmentEntity {
  id: string;
  clinicId: string;
  patientId: string;
  serviceId: string;
  startsAt: Date;
  endsAt: Date;
  priceCents: number;

  @ApiProperty({ enum: AppointmentStatus, enumName: 'AppointmentStatus' })
  status: AppointmentStatus;

  notes: string | null;
  completedAt: Date | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: AppointmentPatientEntity;
  service: AppointmentServiceEntity;
}

export class AppointmentDetailEntity extends AppointmentEntity {
  transaction: TransactionEntity | null;
}

export class AppointmentPageEntity {
  data: AppointmentEntity[];
  meta: PageMetaEntity;
}
