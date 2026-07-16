import type { DayKey } from '@/types';

/** Local-timezone `YYYY-MM-DD`. Deliberately not toISOString(), which shifts to UTC. */
export function toDayKey(date: Date = new Date()): DayKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Parses a DayKey into a local Date at midnight. Returns null if malformed. */
export function fromDayKey(key: DayKey): Date | null {
  if (!isDayKey(key)) return null;
  const [year, month, day] = key.split('-').map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDayLabel(key: DayKey, today: DayKey = toDayKey()): string {
  const date = fromDayKey(key);
  if (!date) return key;

  if (key === today) return 'Today';

  const yesterday = fromDayKey(today);
  if (yesterday) {
    yesterday.setDate(yesterday.getDate() - 1);
    if (toDayKey(yesterday) === key) return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
