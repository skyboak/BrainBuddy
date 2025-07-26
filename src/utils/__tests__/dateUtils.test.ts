import { toDate, formatRelativeDate, getTimeRemaining } from '../dateUtils';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2023-01-01T00:00:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('toDate', () => {
  it('returns same Date instance', () => {
    const d = new Date('2023-01-01T00:00:00Z');
    expect(toDate(d)).toBe(d);
  });

  it('converts timestamp-like object', () => {
    const d = new Date('2023-01-01T00:00:00Z');
    const ts = { toDate: () => d };
    expect(toDate(ts)).toEqual(d);
  });

  it('returns null for null input', () => {
    expect(toDate(null as any)).toBeNull();
  });
});

describe('formatRelativeDate', () => {
  it('formats today', () => {
    const d = new Date('2023-01-01T05:00:00Z');
    expect(formatRelativeDate(d)).toBe('Today');
  });

  it('formats tomorrow', () => {
    const d = new Date('2023-01-02T05:00:00Z');
    expect(formatRelativeDate(d)).toBe('Tomorrow');
  });

  it('formats other dates', () => {
    const d = new Date('2023-01-05T05:00:00Z');
    expect(formatRelativeDate(d)).toBe('1/5/2023');
  });
});

describe('getTimeRemaining', () => {
  it('handles future deadlines', () => {
    const d = new Date('2023-01-01T01:00:00Z');
    expect(getTimeRemaining(d)).toBe('1h 0m left');
  });

  it('handles overdue tasks', () => {
    const d = new Date('2022-12-31T23:59:00Z');
    expect(getTimeRemaining(d)).toBe('Overdue');
  });
});
