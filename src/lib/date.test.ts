import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDayLabel, fromDayKey, isDayKey, toDayKey } from '@/lib/date';

afterEach(() => {
  vi.useRealTimers();
});

describe('toDayKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDayKey(new Date(2026, 6, 16))).toBe('2026-07-16');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses the local calendar day, not UTC', () => {
    // 00:30 local on the 16th is still the 15th in UTC for positive offsets;
    // toISOString() would report the wrong day here.
    const localMidnightish = new Date(2026, 6, 16, 0, 30);
    expect(toDayKey(localMidnightish)).toBe('2026-07-16');
  });

  it('defaults to today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 16, 12));
    expect(toDayKey()).toBe('2026-07-16');
  });
});

describe('isDayKey', () => {
  it('accepts a well-formed key', () => {
    expect(isDayKey('2026-07-16')).toBe(true);
  });

  it('rejects anything else', () => {
    for (const bad of ['2026-7-16', '16-07-2026', 'today', '', null, undefined, 42, {}]) {
      expect(isDayKey(bad)).toBe(false);
    }
  });
});

describe('fromDayKey', () => {
  it('round-trips with toDayKey', () => {
    const key = '2026-07-16';
    const date = fromDayKey(key);
    expect(date).not.toBeNull();
    expect(toDayKey(date as Date)).toBe(key);
  });

  it('returns local midnight', () => {
    const date = fromDayKey('2026-07-16');
    expect(date?.getHours()).toBe(0);
    expect(date?.getDate()).toBe(16);
    expect(date?.getMonth()).toBe(6);
  });

  it('returns null for a malformed key', () => {
    expect(fromDayKey('nonsense')).toBeNull();
  });
});

describe('formatDayLabel', () => {
  it('labels the current day "Today"', () => {
    expect(formatDayLabel('2026-07-16', '2026-07-16')).toBe('Today');
  });

  it('labels the previous day "Yesterday"', () => {
    expect(formatDayLabel('2026-07-15', '2026-07-16')).toBe('Yesterday');
  });

  it('handles "Yesterday" across a month boundary', () => {
    expect(formatDayLabel('2026-06-30', '2026-07-01')).toBe('Yesterday');
  });

  it('handles "Yesterday" across a year boundary', () => {
    expect(formatDayLabel('2025-12-31', '2026-01-01')).toBe('Yesterday');
  });

  it('formats older days as a readable date', () => {
    const label = formatDayLabel('2026-07-10', '2026-07-16');
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
    expect(label.length).toBeGreaterThan(0);
  });

  it('returns the raw key for a malformed input rather than crashing', () => {
    expect(formatDayLabel('garbage', '2026-07-16')).toBe('garbage');
  });
});
