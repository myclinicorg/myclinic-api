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

export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toLocalTime(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    weekday: weekdays.indexOf(part('weekday')),
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

export function minutesOfDay(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
