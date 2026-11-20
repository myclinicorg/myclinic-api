import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticationContext } from '@nestjs/authentication';

@Injectable()
export class ClinicContext {
  constructor(private readonly authenticationContext: AuthenticationContext) {}

  requireClinicId(): string {
    const { clinicId } = this.authenticationContext.requireUser();
    if (!clinicId) {
      throw new ForbiddenException('Cadastre sua clínica antes de continuar', {
        errorCode: 'CLINIC_REQUIRED',
      });
    }
    return clinicId;
  }
}
