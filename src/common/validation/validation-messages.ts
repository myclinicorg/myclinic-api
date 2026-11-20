import { BadRequestException, type ValidationError } from '@nestjs/common';

type Rule = [RegExp, (...groups: string[]) => string];

const rules: Rule[] = [
  [/^(\S+) must be a string$/, (p) => `${p} deve ser um texto`],
  [/^(\S+) should not be empty$/, (p) => `${p} não pode ficar vazio`],
  [
    /^(\S+) must be longer than or equal to (\d+) and shorter than or equal to (\d+) characters$/,
    (p, min, max) => `${p} deve ter entre ${min} e ${max} caracteres`,
  ],
  [
    /^(\S+) must be shorter than or equal to (\d+) characters$/,
    (p, n) => `${p} deve ter no máximo ${n} caracteres`,
  ],
  [
    /^(\S+) must be longer than or equal to (\d+) characters$/,
    (p, n) => `${p} deve ter no mínimo ${n} caracteres`,
  ],
  [/^(\S+) must be an email$/, (p) => `${p} deve ser um e-mail válido`],
  [
    /^(\S+) must be an integer number$/,
    (p) => `${p} deve ser um número inteiro`,
  ],
  [
    /^(\S+) must be a number conforming to the specified constraints$/,
    (p) => `${p} deve ser um número válido`,
  ],
  [
    /^(\S+) must not be less than (\S+)$/,
    (p, n) => `${p} deve ser no mínimo ${n}`,
  ],
  [
    /^(\S+) must not be greater than (\S+)$/,
    (p, n) => `${p} deve ser no máximo ${n}`,
  ],
  [/^(\S+) should not be equal to (\S+)$/, (p, n) => `${p} não pode ser ${n}`],
  [
    /^(\S+) must be a boolean value$/,
    (p) => `${p} deve ser verdadeiro ou falso`,
  ],
  [
    /^(\S+) must be a boolean string$/,
    (p) => `${p} deve ser "true" ou "false"`,
  ],
  [
    /^(\S+) must be one of the following values: (.+)$/,
    (p, values) => `${p} deve ser um dos valores: ${values}`,
  ],
  [/^(\S+) must be a UUID$/, (p) => `${p} deve ser um UUID válido`],
  [
    /^(\S+) must be a valid ISO 8601 date string$/,
    (p) => `${p} deve ser uma data válida no formato ISO 8601`,
  ],
  [/^(\S+) must be an array$/, (p) => `${p} deve ser uma lista`],
  [
    /^All (\S+)'s elements must be unique$/,
    (p) => `${p} não pode ter valores repetidos`,
  ],
  [
    /^(\S+) must contain no more than (\d+) elements$/,
    (p, n) => `${p} deve ter no máximo ${n} itens`,
  ],
  [
    /^(\S+) must match .+ regular expression$/,
    (p) => `${p} está em um formato inválido`,
  ],
  [/^property (\S+) should not exist$/, (p) => `${p} não é permitido`],
];

export function translateValidationMessage(message: string): string {
  const each = /^each value in (\S+) (.+)$/.exec(message);
  if (each) {
    const [, property, rest] = each;
    return translateValidationMessage(`${property} ${rest}`).replace(
      property,
      `cada valor de ${property}`,
    );
  }
  for (const [pattern, translate] of rules) {
    const match = pattern.exec(message);
    if (match) {
      return translate(...match.slice(1));
    }
  }
  return message;
}

export function validationExceptionFactory(errors: ValidationError[]) {
  const messages = flatten(errors).map(translateValidationMessage);
  return new BadRequestException(messages);
}

function flatten(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((error) => {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) =>
      prefix ? message.replace(error.property, path) : message,
    );
    return [...own, ...flatten(error.children ?? [], path)];
  });
}
