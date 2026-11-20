export class ClinicEntity {
  id: string;
  ownerId: string;
  name: string;
  cnpj: string;
  description: string | null;
  phone: string | null;
  contactEmail: string | null;
  zipCode: string | null;
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  addressComplement: string | null;
  city: string | null;
  state: string | null;
  openingTime: string | null;
  closingTime: string | null;
  workingDays: number[];
  createdAt: Date;
  updatedAt: Date;
}
