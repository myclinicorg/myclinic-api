import { PageMetaEntity } from '../../common/page-meta.entity.js';

export class ServiceEntity {
  id: string;
  clinicId: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ServicePageEntity {
  data: ServiceEntity[];
  meta: PageMetaEntity;
}
