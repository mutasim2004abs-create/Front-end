import { Camera, Database, PencilLine, Trash2 } from 'lucide-react';
import type { DayKey, EntrySource, LogEntry, MealSlot } from '@/types';
import { sumMacros } from '@/lib/macros';
import { useStore } from '@/lib/useStore';
import { MEAL_LABELS } from '@/features/log/meals';

/** Where an entry's numbers came from. Shown so estimates are never mistaken for facts. */
const SOURCE_BADGE: Record<EntrySource, { icon: typeof Database; title: string }> = {
  'food-db': { icon: Database, title: 'From the food database (reference values)' },
  scan: { icon: Camera, title: 'AI estimate from a photo, reviewed by you' },
  manual: { icon: PencilLine, title: 'Entered by hand' },
};

interface MealListProps {
  slot: MealSlot;
  date: DayKey;
  entries: readonly LogEntry[];
  /** Hide the section entirely when the meal has no entries. */
  hideWhenEmpty?: boolean;
}

export function MealList({
  slot,
  date,
  entries,
  hideWhenEmpty = true,
}: MealListProps): JSX.Element | null {
  const store = useStore();
  const mealEntries = entries.filter((entry) => entry.meal === slot);

  if (mealEntries.length === 0 && hideWhenEmpty) return null;

  const totals = sumMacros(mealEntries);

  return (
    <section aria-labelledby={`meal-${slot}-${date}`}>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 id={`meal-${slot}-${date}`} className="text-sm font-bold text-white">
          {MEAL_LABELS[slot]}
        </h3>
        <span className="text-xs text-gray tabular-nums">{Math.round(totals.kcal)} kcal</span>
      </div>

      {mealEntries.length === 0 ? (
        <p className="rounded-md border border-dashed border-[color:var(--border)] px-3 py-3 text-xs text-gray-soft">
          Nothing logged.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {mealEntries.map((entry) => {
            const badge = SOURCE_BADGE[entry.source];
            const Icon = badge.icon;

            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-md border border-[color:var(--border)] bg-surface-2/70 px-3 py-2.5"
              >
                <span className="shrink-0 text-gray-soft" title={badge.title}>
                  <Icon size={15} aria-hidden="true" />
                  <span className="sr-only">{badge.title}</span>
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{entry.name}</p>
                  <p className="text-[11px] text-gray tabular-nums">
                    {Math.round(entry.grams)} g · P {entry.protein} · C {entry.carbs} · F{' '}
                    {entry.fat}
                  </p>
                </div>

                <span className="shrink-0 text-sm font-bold tabular-nums text-white">
                  {Math.round(entry.kcal)}
                </span>

                <button
                  type="button"
                  onClick={() => store.removeEntry(entry.id, date)}
                  aria-label={`Remove ${entry.name} from ${MEAL_LABELS[slot]}`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-sm text-gray-soft transition-colors hover:bg-surface-3 hover:text-danger"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
