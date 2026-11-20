import { PageMetaEntity } from '../../common/page-meta.entity.js';

export class PatientEntity {
  id: string;
  clinicId: string;
  fullName: string;
  cpf: string;
  sex: string | null;
  dateOfBirth: Date | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  zipCode: string | null;
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  addressComplement: string | null;
  city: string | null;
  state: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PatientPageEntity {
  data: PatientEntity[];
  meta: PageMetaEntity;
}
