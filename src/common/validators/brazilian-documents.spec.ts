import { isCnpj, isCpf } from './brazilian-documents.js';

describe('brazilian documents', () => {
  it.each(['12345678909', '98765432100', '52998224725'])(
    'accepts the CPF %s',
    (cpf) => expect(isCpf(cpf)).toBe(true),
  );

  it.each(['12345678901', '11111111111', '123.456.789-09', '1234567890', 123])(
    'rejects the CPF %s',
    (cpf) => expect(isCpf(cpf)).toBe(false),
  );

  it.each(['12345678000195', '98765432000198', '11222333000181'])(
    'accepts the CNPJ %s',
    (cnpj) => expect(isCnpj(cnpj)).toBe(true),
  );

  it.each([
    '12345678000190',
    '00000000000000',
    '12.345.678/0001-95',
    '1234567800019',
  ])('rejects the CNPJ %s', (cnpj) => expect(isCnpj(cnpj)).toBe(false));
});
