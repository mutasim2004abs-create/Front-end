/** Shared domain types. Kept dependency-free so lib/ and data/ stay pure. */

export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';

export type Goal = 'cut' | 'maintain' | 'bulk';

export interface Profile {
  sex: Sex;
  /** years */
  age: number;
  /** centimetres */
  heightCm: number;
  /** kilograms */
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
}

/** Grams of each macro plus the calories they add up to. */
export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Targets extends Macros {
  bmr: number;
  tdee: number;
}

export type FoodCategory =
  | 'protein'
  | 'grains'
  | 'dairy'
  | 'fruit'
  | 'vegetables'
  | 'fats & nuts'
  | 'snacks'
  | 'drinks'
  | 'turkish & middle eastern';

export interface CommonPortion {
  label: string;
  grams: number;
}

/**
 * Approximate reference values per 100 g. See data/foods.ts for the basis and
 * the honesty note shown in the UI.
 */
export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  per: 100;
  commonPortions: CommonPortion[];
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** How a logged entry got its numbers — surfaced in the UI, never hidden. */
export type EntrySource = 'food-db' | 'scan' | 'manual';

export interface LogEntry {
  id: string;
  /** Food id when source is 'food-db'; absent for scanned/manual entries. */
  foodId?: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: MealSlot;
  source: EntrySource;
  /** epoch ms */
  loggedAt: number;
}

/** ISO date key, `YYYY-MM-DD`, in the user's local timezone. */
export type DayKey = string;

export interface DayLog {
  date: DayKey;
  entries: LogEntry[];
}

export interface Settings {
  /** Reserved for a future imperial toggle; metric is the only implemented unit today. */
  units: 'metric';
  reducedMotion: boolean;
}

export interface AppState {
  version: number;
  profile: Profile | null;
  targets: Targets | null;
  days: Record<DayKey, DayLog>;
  settings: Settings;
}

/** One item as estimated by the AI scan. Always editable before it is logged. */
export interface AnalyzedItem {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** 0..1 — the model's own stated confidence. Displayed, never hidden. */
  confidence: number;
}

export interface AnalyzeMealResponse {
  items: AnalyzedItem[];
  totals: Macros;
  note: string;
}
