import { useMemo, useRef, useState } from 'react';
import { Info, Search, SearchX } from 'lucide-react';
import type { Food, FoodCategory, MealSlot } from '@/types';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FOODS, FOOD_DATA_DISCLAIMER } from '@/data/foods';
import { foodsByCategory, listCategories, searchFoods } from '@/lib/search';
import { macrosForGrams } from '@/lib/macros';
import { toDayKey } from '@/lib/date';
import { useStore } from '@/lib/useStore';
import { cn } from '@/lib/cn';
import { PortionPanel } from '@/features/log/PortionPanel';
import { MEAL_LABELS, suggestMeal } from '@/features/log/meals';

const CATEGORIES = listCategories();

export function LogScreen(): JSX.Element {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FoodCategory | 'all'>('all');
  const [selected, setSelected] = useState<Food | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ~180 rows: a linear scan per keystroke is far cheaper than a debounce would cost us.
  const results = useMemo(() => {
    if (query.trim()) return searchFoods(query, { category, limit: 40 });
    if (category !== 'all') return foodsByCategory(category);
    return [];
  }, [query, category]);

  const handleAdd = (food: Food, grams: number, meal: MealSlot): void => {
    const macros = macrosForGrams(food, grams);
    store.addEntry(
      {
        foodId: food.id,
        name: food.name,
        grams,
        kcal: macros.kcal,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        meal,
        source: 'food-db',
      },
      toDayKey(),
    );

    setSelected(null);
    setQuery('');
    setConfirmation(`${food.name} added to ${MEAL_LABELS[meal]}.`);
    // Return focus to the search box so logging several foods stays keyboard-friendly.
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  if (selected) {
    return (
      <PortionPanel
        food={selected}
        defaultMeal={suggestMeal()}
        onBack={() => setSelected(null)}
        onAdd={(grams, meal) => handleAdd(selected, grams, meal)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        eyebrow="Log"
        title="Add food"
        subtitle={`Search ${FOODS.length} foods, pick a portion, and it lands on today's totals.`}
      />

      {/* One persistent live region: it must exist in the DOM before the text changes for
          the announcement to land, and duplicating it would announce twice. */}
      <p
        role="status"
        aria-live="polite"
        className={cn(
          confirmation
            ? 'rounded-md border border-[color:var(--success)]/40 bg-success/10 px-3 py-2.5 text-xs font-medium text-success'
            : 'sr-only',
        )}
      >
        {confirmation}
      </p>

      <div className="relative">
        <Search
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-soft"
        />
        <label htmlFor="food-search" className="sr-only">
          Search foods
        </label>
        <input
          id="food-search"
          ref={searchRef}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setConfirmation(null);
          }}
          placeholder="Search chicken, bulgur, ayran…"
          className="min-h-[48px] w-full rounded-md border border-[color:var(--border)] bg-black-soft pl-11 pr-4 text-[15px] text-white placeholder:text-gray-soft focus:border-[color:var(--border-strong)]"
        />
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {(['all', ...CATEGORIES] as const).map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={active}
                className={cn(
                  'min-h-[44px] shrink-0 whitespace-nowrap rounded-md border px-3.5 text-xs capitalize transition-colors',
                  active
                    ? 'border-[color:var(--border-strong)] bg-gold/15 font-bold text-white'
                    : 'border-[color:var(--border)] bg-surface-2 text-gray hover:text-white',
                )}
              >
                {item === 'all' ? 'All' : item}
              </button>
            );
          })}
        </div>
      </div>

      {results.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => setSelected(food)}
                className="flex w-full items-center gap-3 rounded-md border border-[color:var(--border)] bg-surface-2/70 px-3.5 py-3 text-left transition-colors hover:border-[color:var(--border-strong)] hover:bg-surface-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{food.name}</p>
                  <p className="text-[11px] text-gray tabular-nums">
                    per 100 g · P {food.protein} · C {food.carbs} · F {food.fat}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-gold-light">
                  {food.kcal}
                  <span className="ml-1 text-[10px] font-normal text-gray">kcal</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim() ? (
        <EmptyState
          icon={SearchX}
          title={`No food matches “${query.trim()}”`}
          description="Try a shorter or more general word — the database covers common foods, not brands or restaurant items."
        />
      ) : (
        <EmptyState
          icon={Search}
          title="Search the food database"
          description={`Start typing, or pick a category above to browse all ${FOODS.length} foods.`}
        />
      )}

      <p className="mt-2 flex gap-2 text-[11px] leading-relaxed text-gray-soft">
        <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {FOOD_DATA_DISCLAIMER}
      </p>
    </div>
  );
}
