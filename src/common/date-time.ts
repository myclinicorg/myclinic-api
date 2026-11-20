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

export function startOfLocalDay(day: string): Date {
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    timeZoneName: 'longOffset',
  })
    .formatToParts(new Date(`${day}T12:00:00Z`))
    .find((part) => part.type === 'timeZoneName')
    ?.value.replace('GMT', '');
  return new Date(`${day}T00:00:00${offset || 'Z'}`);
}

export function startOfNextLocalDay(day: string): Date {
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return startOfLocalDay(next.toISOString().slice(0, 10));
}
