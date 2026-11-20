import {
  startOfLocalDay,
  startOfNextLocalDay,
  toLocalDate,
} from './date-time.js';

describe('date-time', () => {
  it('converts a local day to its UTC start', () => {
    expect(startOfLocalDay('2026-12-01').toISOString()).toBe(
      '2026-12-01T03:00:00.000Z',
    );
    expect(startOfNextLocalDay('2026-12-31').toISOString()).toBe(
      '2027-01-01T03:00:00.000Z',
    );
  });

  it('reads the local date of an instant', () => {
    expect(toLocalDate(new Date('2026-12-02T01:30:00Z')).toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );
  });
});
