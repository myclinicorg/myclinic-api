import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAppointmentDto } from '../../appointments/dto/create-appointment.dto.js';
import { SignUpDto } from '../../auth/auth.dto.js';
import { CreateClinicDto } from '../../clinics/dto/create-clinic.dto.js';
import { CreateServiceDto } from '../../services/dto/create-service.dto.js';
import { FindServicesDto } from '../../services/dto/find-services.dto.js';
import { CreateStockMovementDto } from '../../supplies/dto/create-stock-movement.dto.js';
import { CreateTransactionDto } from '../../transactions/dto/create-transaction.dto.js';
import {
  translateValidationMessage,
  validationExceptionFactory,
} from './validation-messages.js';

async function messages(cls: new () => object, plain: object) {
  const errors = await validate(plainToInstance(cls, plain));
  const response = validationExceptionFactory(errors).getResponse() as {
    message: string[];
  };
  return response.message;
}

describe('validation messages', () => {
  it('translates the messages of the DTOs', async () => {
    const all = [
      ...(await messages(SignUpDto, { name: '', email: 'x', password: 1 })),
      ...(await messages(CreateServiceDto, {
        name: 'a'.repeat(200),
        priceCents: 1.5,
        durationMinutes: 1000,
        active: 'yes',
      })),
      ...(await messages(CreateClinicDto, {
        name: 'Clínica',
        cnpj: '1',
        state: 'sp',
        workingDays: [7, 7],
      })),
      ...(await messages(FindServicesDto, { active: 'sim' })),
      ...(await messages(CreateStockMovementDto, {
        type: 'X',
        quantity: 0,
      })),
      ...(await messages(CreateAppointmentDto, {
        patientId: '1',
        serviceId: '2',
        startsAt: 'amanhã',
      })),
      ...(await messages(CreateTransactionDto, {
        type: 'INCOME',
        category: 'SERVICE',
        amountCents: 0,
        dueDate: '2030-01-01',
        paymentMethod: 'CHEQUE',
      })),
    ];

    expect(all).toEqual(
      expect.arrayContaining([
        'name não pode ficar vazio',
        'email deve ser um e-mail válido',
        'password deve ser um texto',
        'name deve ter no máximo 120 caracteres',
        'priceCents deve ser um número inteiro',
        'durationMinutes deve ser no máximo 720',
        'active deve ser verdadeiro ou falso',
        'cnpj deve ser um CNPJ válido (14 dígitos)',
        'state deve ser a sigla da UF',
        'cada valor de workingDays deve ser no máximo 6',
        'workingDays não pode ter valores repetidos',
        'active deve ser "true" ou "false"',
        'quantity não pode ser 0',
        'patientId deve ser um UUID válido',
        'amountCents deve ser no mínimo 1',
      ]),
    );
    expect(all.filter((message) => /\b(must|should)\b/.test(message))).toEqual(
      [],
    );
  });

  it('keeps unknown messages', () => {
    expect(translateValidationMessage('mensagem própria')).toBe(
      'mensagem própria',
    );
  });
});
