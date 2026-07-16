import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState, Profile } from '@/types';
import {
  SCHEMA_VERSION,
  STORAGE_KEY,
  createStore,
  defaultState,
  loadState,
  migrate,
  saveState,
  selectDay,
  selectLoggedDays,
} from '@/lib/store';
import { calculateTargets } from '@/lib/macros';
import { toDayKey } from '@/lib/date';

const profile: Profile = {
  sex: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'moderate',
  goal: 'maintain',
};

const entry = {
  name: 'Chicken breast, cooked',
  grams: 150,
  kcal: 248,
  protein: 46.5,
  carbs: 0,
  fat: 5.4,
  meal: 'lunch' as const,
  source: 'food-db' as const,
  foodId: 'chicken-breast',
};

beforeEach(() => {
  localStorage.clear();
});

describe('defaultState', () => {
  it('starts empty at the current schema version', () => {
    const state = defaultState();
    expect(state).toEqual({
      version: SCHEMA_VERSION,
      profile: null,
      targets: null,
      days: {},
      settings: { units: 'metric', reducedMotion: false },
    });
  });
});

describe('persistence — the thing v1 got wrong', () => {
  it('writes to localStorage under the versioned key', () => {
    const store = createStore(defaultState());
    store.setProfile(profile);

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw ?? '{}')).toMatchObject({ version: SCHEMA_VERSION });
  });

  it('survives a "refresh": a fresh store loads the previous profile and log', () => {
    const first = createStore(defaultState());
    first.setProfile(profile);
    first.addEntry(entry);

    // Simulate a page reload — brand new store reading from storage.
    const second = createStore(loadState());

    expect(second.getState().profile).toEqual(profile);
    expect(second.getState().targets).toEqual(calculateTargets(profile));
    expect(selectDay(second.getState(), toDayKey()).entries).toHaveLength(1);
    expect(selectDay(second.getState(), toDayKey()).entries[0]?.name).toBe(entry.name);
  });

  it('keeps entries across many reload cycles', () => {
    for (let i = 0; i < 3; i += 1) {
      const store = createStore(loadState());
      store.addEntry({ ...entry, name: `Meal ${i}` });
    }
    expect(selectDay(loadState(), toDayKey()).entries).toHaveLength(3);
  });

  it('reports isPersisted() false when localStorage throws (private mode)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    const store = createStore(defaultState());
    store.setProfile(profile);

    // The app must keep working in memory rather than crash.
    expect(store.getState().profile).toEqual(profile);
    expect(store.isPersisted()).toBe(false);
  });

  it('falls back to defaults when storage contains invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json at all');
    expect(loadState()).toEqual(defaultState());
  });

  it('returns defaults when nothing is stored', () => {
    expect(loadState()).toEqual(defaultState());
  });
});

describe('migrate — untrusted input', () => {
  it('returns defaults for non-object payloads', () => {
    for (const bad of [null, undefined, 42, 'string', []]) {
      expect(migrate(bad)).toEqual(defaultState());
    }
  });

  it('stamps the current schema version onto older data', () => {
    expect(migrate({ version: 1, profile, days: {} }).version).toBe(SCHEMA_VERSION);
  });

  it('recomputes targets when they are missing but a profile exists', () => {
    const migrated = migrate({ version: SCHEMA_VERSION, profile, days: {} });
    expect(migrated.targets).toEqual(calculateTargets(profile));
  });

  it('drops a malformed profile rather than trusting it', () => {
    const migrated = migrate({
      version: SCHEMA_VERSION,
      profile: { sex: 'male', age: 0, heightCm: 0, weightKg: 0 },
      days: {},
    });
    expect(migrated.profile).toBeNull();
    expect(migrated.targets).toBeNull();
  });

  it('coerces unknown enum values to safe defaults', () => {
    const migrated = migrate({
      version: SCHEMA_VERSION,
      profile: { ...profile, sex: 'xx', activity: 'hyper', goal: 'shred' },
      days: {},
    });
    expect(migrated.profile?.sex).toBe('male');
    expect(migrated.profile?.activity).toBe('sedentary');
    expect(migrated.profile?.goal).toBe('maintain');
  });

  it('discards day keys that are not YYYY-MM-DD', () => {
    const migrated = migrate({
      version: SCHEMA_VERSION,
      days: { 'not-a-date': { entries: [] }, '2026-07-16': { entries: [] } },
    });
    expect(Object.keys(migrated.days)).toEqual(['2026-07-16']);
  });

  it('drops entries with no name and repairs missing ids', () => {
    const migrated = migrate({
      version: SCHEMA_VERSION,
      days: {
        '2026-07-16': {
          entries: [
            { name: '', kcal: 100 },
            { name: 'Valid food', kcal: 100, grams: 100 },
            'garbage',
          ],
        },
      },
    });

    const entries = migrated.days['2026-07-16']?.entries ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0]?.name).toBe('Valid food');
    expect(entries[0]?.id).toBeTruthy();
  });

  it('clamps negative macros in stored entries to zero', () => {
    const migrated = migrate({
      version: SCHEMA_VERSION,
      days: {
        '2026-07-16': {
          entries: [{ name: 'Weird', kcal: -500, protein: -10, carbs: NaN, fat: 5, grams: -1 }],
        },
      },
    });

    const stored = migrated.days['2026-07-16']?.entries[0];
    expect(stored?.kcal).toBe(0);
    expect(stored?.protein).toBe(0);
    expect(stored?.carbs).toBe(0);
    expect(stored?.grams).toBe(0);
    expect(stored?.fat).toBe(5);
  });

  it('salvages what it understands from a payload written by a newer version', () => {
    const migrated = migrate({
      version: SCHEMA_VERSION + 99,
      profile,
      days: { '2026-07-16': { entries: [{ name: 'Future food', kcal: 100, grams: 100 }] } },
      somethingNew: { we: 'do not know about' },
    });

    expect(migrated.profile).toEqual(profile);
    expect(migrated.days['2026-07-16']?.entries).toHaveLength(1);
  });

  it('round-trips a saved state without loss', () => {
    const store = createStore(defaultState());
    store.setProfile(profile);
    store.addEntry(entry);
    const before = store.getState();

    expect(migrate(JSON.parse(JSON.stringify(before)))).toEqual(before);
  });
});

describe('store mutations', () => {
  it('computes and stores targets when the profile is set', () => {
    const store = createStore(defaultState());
    store.setProfile(profile);
    expect(store.getState().targets).toEqual(calculateTargets(profile));
  });

  it('recomputes targets when the profile changes', () => {
    const store = createStore(defaultState());
    store.setProfile(profile);
    const before = store.getState().targets?.kcal ?? 0;

    store.setProfile({ ...profile, goal: 'cut' });
    expect(store.getState().targets?.kcal).toBeLessThan(before);
  });

  it('adds an entry with a generated id and timestamp', () => {
    const store = createStore(defaultState());
    const added = store.addEntry(entry);

    expect(added.id).toBeTruthy();
    expect(added.loggedAt).toBeGreaterThan(0);
    expect(selectDay(store.getState(), toDayKey()).entries).toEqual([added]);
  });

  it('gives every entry a unique id', () => {
    const store = createStore(defaultState());
    const ids = new Set(Array.from({ length: 50 }, () => store.addEntry(entry).id));
    expect(ids.size).toBe(50);
  });

  it('adds entries to a specific day', () => {
    const store = createStore(defaultState());
    store.addEntry(entry, '2026-01-01');

    expect(selectDay(store.getState(), '2026-01-01').entries).toHaveLength(1);
    expect(selectDay(store.getState(), toDayKey()).entries).toHaveLength(0);
  });

  it('removes an entry by id', () => {
    const store = createStore(defaultState());
    const added = store.addEntry(entry);
    store.removeEntry(added.id);
    expect(selectDay(store.getState(), toDayKey()).entries).toHaveLength(0);
  });

  it('ignores removal of an unknown id or an empty day', () => {
    const store = createStore(defaultState());
    const before = store.getState();

    store.removeEntry('does-not-exist');
    store.removeEntry('does-not-exist', '2020-01-01');

    expect(store.getState()).toBe(before); // no needless re-render
  });

  it('treats state as immutable between commits', () => {
    const store = createStore(defaultState());
    const before = store.getState();
    store.addEntry(entry);
    expect(store.getState()).not.toBe(before);
    expect(before.days[toDayKey()]).toBeUndefined();
  });

  it('updates settings without touching the log', () => {
    const store = createStore(defaultState());
    store.addEntry(entry);
    store.setSettings({ reducedMotion: true });

    expect(store.getState().settings.reducedMotion).toBe(true);
    expect(selectDay(store.getState(), toDayKey()).entries).toHaveLength(1);
  });
});

describe('subscriptions', () => {
  it('notifies subscribers on change', () => {
    const store = createStore(defaultState());
    const listener = vi.fn();
    store.subscribe(listener);

    store.addEntry(entry);
    expect(listener).toHaveBeenCalledTimes(1);

    store.setProfile(profile);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createStore(defaultState());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.addEntry(entry);
    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies on reset', () => {
    const store = createStore(defaultState());
    const listener = vi.fn();
    store.subscribe(listener);

    store.reset();
    expect(listener).toHaveBeenCalled();
  });
});

describe('export and reset', () => {
  it('exports the full state as readable JSON', () => {
    const store = createStore(defaultState());
    store.setProfile(profile);
    store.addEntry(entry);

    const parsed = JSON.parse(store.exportJSON()) as AppState;
    expect(parsed.profile).toEqual(profile);
    expect(parsed.version).toBe(SCHEMA_VERSION);
    expect(parsed.days[toDayKey()]?.entries).toHaveLength(1);
  });

  it('reset clears both memory and storage', () => {
    const store = createStore(defaultState());
    store.setProfile(profile);
    store.addEntry(entry);

    store.reset();

    expect(store.getState()).toEqual(defaultState());
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadState()).toEqual(defaultState());
  });
});

describe('selectors', () => {
  it('selectDay returns an empty day for a date with no entries', () => {
    expect(selectDay(defaultState(), '2026-01-01')).toEqual({ date: '2026-01-01', entries: [] });
  });

  it('selectLoggedDays returns days with entries, newest first', () => {
    const store = createStore(defaultState());
    store.addEntry(entry, '2026-01-01');
    store.addEntry(entry, '2026-03-05');
    store.addEntry(entry, '2026-02-02');

    expect(selectLoggedDays(store.getState()).map((d) => d.date)).toEqual([
      '2026-03-05',
      '2026-02-02',
      '2026-01-01',
    ]);
  });

  it('selectLoggedDays skips days whose entries were all removed', () => {
    const store = createStore(defaultState());
    const added = store.addEntry(entry, '2026-01-01');
    store.removeEntry(added.id, '2026-01-01');

    expect(selectLoggedDays(store.getState())).toEqual([]);
  });
});

describe('saveState', () => {
  it('returns false instead of throwing when storage rejects the write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(saveState(defaultState())).toBe(false);
  });
});
