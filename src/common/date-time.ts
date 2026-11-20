export const APP_TIME_ZONE = 'America/Sao_Paulo';

export const DATE_TIME_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export function toLocalDate(date: Date): Date {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
  }).format(date);
  return new Date(day);
}

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
