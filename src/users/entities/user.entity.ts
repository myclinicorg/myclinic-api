export class UserEntity {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  clinicId: string | null;
}
