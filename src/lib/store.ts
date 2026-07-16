import type {
  ActivityLevel,
  AppState,
  DayKey,
  DayLog,
  EntrySource,
  Goal,
  LogEntry,
  MealSlot,
  Profile,
  Settings,
  Targets,
} from '@/types';
import { calculateTargets } from '@/lib/macros';
import { isDayKey, toDayKey } from '@/lib/date';

/**
 * Typed, versioned localStorage persistence.
 *
 * Everything read back from storage is treated as untrusted input and validated
 * field by field: a corrupt or hand-edited blob degrades to defaults instead of
 * crashing the app. Bump SCHEMA_VERSION and add a migration when the shape changes.
 */

export const STORAGE_KEY = 'fitmacro.v2';
export const SCHEMA_VERSION = 2;

const DEFAULT_SETTINGS: Settings = { units: 'metric', reducedMotion: false };

export function defaultState(): AppState {
  return { version: SCHEMA_VERSION, profile: null, targets: null, days: {}, settings: DEFAULT_SETTINGS };
}

/* ------------------------------------------------------------------ *
 * Validation helpers — the trust boundary between storage and the app *
 * ------------------------------------------------------------------ */

const SEXES = ['male', 'female'] as const;
const ACTIVITIES: readonly ActivityLevel[] = ['sedentary', 'light', 'moderate', 'very', 'extra'];
const GOALS: readonly Goal[] = ['cut', 'maintain', 'bulk'];
const MEALS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const SOURCES: readonly EntrySource[] = ['food-db', 'scan', 'manual'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function parseProfile(value: unknown): Profile | null {
  if (!isRecord(value)) return null;
  const age = num(value.age);
  const heightCm = num(value.heightCm);
  const weightKg = num(value.weightKg);
  if (age <= 0 || heightCm <= 0 || weightKg <= 0) return null;

  return {
    sex: oneOf(value.sex, SEXES, 'male'),
    age,
    heightCm,
    weightKg,
    activity: oneOf(value.activity, ACTIVITIES, 'sedentary'),
    goal: oneOf(value.goal, GOALS, 'maintain'),
  };
}

function parseEntry(value: unknown): LogEntry | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return null;

  const foodId = typeof value.foodId === 'string' ? value.foodId : undefined;
  const entry: LogEntry = {
    id: typeof value.id === 'string' && value.id ? value.id : createId(),
    name,
    grams: Math.max(0, num(value.grams)),
    kcal: Math.max(0, num(value.kcal)),
    protein: Math.max(0, num(value.protein)),
    carbs: Math.max(0, num(value.carbs)),
    fat: Math.max(0, num(value.fat)),
    meal: oneOf(value.meal, MEALS, 'snack'),
    source: oneOf(value.source, SOURCES, 'manual'),
    loggedAt: num(value.loggedAt, Date.now()),
  };
  return foodId === undefined ? entry : { ...entry, foodId };
}

function parseDays(value: unknown): Record<DayKey, DayLog> {
  if (!isRecord(value)) return {};
  const days: Record<DayKey, DayLog> = {};

  for (const [key, raw] of Object.entries(value)) {
    if (!isDayKey(key) || !isRecord(raw)) continue;
    const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
    const entries = rawEntries
      .map(parseEntry)
      .filter((entry): entry is LogEntry => entry !== null);
    days[key] = { date: key, entries };
  }
  return days;
}

function parseSettings(value: unknown): Settings {
  if (!isRecord(value)) return DEFAULT_SETTINGS;
  return {
    units: 'metric',
    reducedMotion: value.reducedMotion === true,
  };
}

function parseTargets(value: unknown, profile: Profile | null): Targets | null {
  if (isRecord(value) && num(value.kcal) > 0) {
    return {
      bmr: Math.max(0, num(value.bmr)),
      tdee: Math.max(0, num(value.tdee)),
      kcal: num(value.kcal),
      protein: Math.max(0, num(value.protein)),
      carbs: Math.max(0, num(value.carbs)),
      fat: Math.max(0, num(value.fat)),
    };
  }
  // Targets are derivable — recompute rather than lose the user's setup.
  return profile ? calculateTargets(profile) : null;
}

/* --------------------------------- *
 * Migration                          *
 * --------------------------------- */

/**
 * A migration step transforms a stored blob from one schema version to the next.
 * Registered per source version; `migrate` walks the chain until SCHEMA_VERSION.
 *
 * There is intentionally nothing here yet: v2 is the first schema that ever wrote to
 * storage (v1 of FitMacro persisted nothing at all), so no older payload exists in the
 * wild to migrate from. When v3 lands, add `2: (raw) => ...` and the chain runs itself.
 */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

/**
 * Brings any persisted blob up to SCHEMA_VERSION, then validates it.
 *
 * Blobs written by a *newer* build are hydrated on a best-effort basis: we read the
 * fields we understand and drop the rest, which is preferable to wiping the user's log.
 */
export function migrate(raw: unknown): AppState {
  if (!isRecord(raw)) return defaultState();

  let working = raw;
  let version = num(working.version, SCHEMA_VERSION);

  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break; // Unknown legacy shape — hydrate() below salvages what it can.
    working = step(working);
    version += 1;
  }

  return hydrate(working);
}

function hydrate(raw: Record<string, unknown>): AppState {
  const profile = parseProfile(raw.profile);
  return {
    version: SCHEMA_VERSION,
    profile,
    targets: parseTargets(raw.targets, profile),
    days: parseDays(raw.days),
    settings: parseSettings(raw.settings),
  };
}

/* --------------------------------- *
 * Storage I/O                        *
 * --------------------------------- */

function safeStorage(): Storage | null {
  try {
    const probe = '__fitmacro_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    // Private mode / disabled storage: the app still runs, in-memory only.
    return null;
  }
}

export function loadState(): AppState {
  const storage = safeStorage();
  if (!storage) return defaultState();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): boolean {
  const storage = safeStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* --------------------------------- *
 * Store                              *
 * --------------------------------- */

type Listener = () => void;

export interface Store {
  getState: () => AppState;
  subscribe: (listener: Listener) => () => void;
  setProfile: (profile: Profile) => void;
  addEntry: (entry: Omit<LogEntry, 'id' | 'loggedAt'>, date?: DayKey) => LogEntry;
  removeEntry: (id: string, date?: DayKey) => void;
  setSettings: (patch: Partial<Settings>) => void;
  exportJSON: () => string;
  reset: () => void;
  /** True when writes are not reaching localStorage (private mode, quota, etc.). */
  isPersisted: () => boolean;
}

export function createStore(initial: AppState = loadState()): Store {
  let state: AppState = initial;
  let persisted = true;
  const listeners = new Set<Listener>();

  const commit = (next: AppState): void => {
    state = next;
    persisted = saveState(state);
    listeners.forEach((listener) => listener());
  };

  const dayOf = (state: AppState, date: DayKey): DayLog => state.days[date] ?? { date, entries: [] };

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setProfile(profile) {
      commit({ ...state, profile, targets: calculateTargets(profile) });
    },

    addEntry(input, date = toDayKey()) {
      const entry: LogEntry = { ...input, id: createId(), loggedAt: Date.now() };
      const day = dayOf(state, date);
      commit({
        ...state,
        days: { ...state.days, [date]: { date, entries: [...day.entries, entry] } },
      });
      return entry;
    },

    removeEntry(id, date = toDayKey()) {
      const day = state.days[date];
      if (!day) return;
      const entries = day.entries.filter((entry) => entry.id !== id);
      if (entries.length === day.entries.length) return;
      commit({ ...state, days: { ...state.days, [date]: { date, entries } } });
    },

    setSettings(patch) {
      commit({ ...state, settings: { ...state.settings, ...patch } });
    },

    exportJSON() {
      return JSON.stringify(state, null, 2);
    },

    reset() {
      const storage = safeStorage();
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        /* nothing more we can do; in-memory reset below still applies */
      }
      state = defaultState();
      persisted = true;
      listeners.forEach((listener) => listener());
    },

    isPersisted: () => persisted,
  };
}

/** The app-wide store instance. Tests create their own via createStore(). */
export const store = createStore();

/* --------------------------------- *
 * Selectors (pure)                   *
 * --------------------------------- */

export function selectDay(state: AppState, date: DayKey): DayLog {
  return state.days[date] ?? { date, entries: [] };
}

/** Days that have at least one entry, newest first. */
export function selectLoggedDays(state: AppState): DayLog[] {
  return Object.values(state.days)
    .filter((day) => day.entries.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}
