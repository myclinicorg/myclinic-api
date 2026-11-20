import { ValidateBy, type ValidationOptions } from 'class-validator';

export function isCpf(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{11}$/.test(value)) {
    return false;
  }
  const digits = value.split('').map(Number);
  if (new Set(digits).size === 1) {
    return false;
  }
  return [9, 10].every((length) => {
    const sum = digits
      .slice(0, length)
      .reduce((total, digit, i) => total + digit * (length + 1 - i), 0);
    return ((sum * 10) % 11) % 10 === digits[length];
  });
}

export function isCnpj(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{14}$/.test(value)) {
    return false;
  }
  const digits = value.split('').map(Number);
  if (new Set(digits).size === 1) {
    return false;
  }
  const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return [12, 13].every((length) => {
    const sum = digits
      .slice(0, length)
      .reduce((total, digit, i) => total + digit * weights[i + 13 - length], 0);
    const remainder = sum % 11;
    return (remainder < 2 ? 0 : 11 - remainder) === digits[length];
  });
}

export function IsCpf(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isCpf',
      validator: {
        validate: isCpf,
        defaultMessage: () => '$property deve ser um CPF válido (11 dígitos)',
      },
    },
    validationOptions,
  );
}

export function IsCnpj(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isCnpj',
      validator: {
        validate: isCnpj,
        defaultMessage: () => '$property deve ser um CNPJ válido (14 dígitos)',
      },
    },
    validationOptions,
  );
}
