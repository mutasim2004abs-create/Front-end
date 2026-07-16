# FitMacro

A nutrition tracker: work out your calorie and macro targets from a real formula, log
real foods from a curated database, and keep the data on your own device.

Built by **Mutasim Abbas** — BSc Software Engineering, Istanbul Atlas University.

> **v2 is a full rebuild.** v1 looked the part but had zero persistence, zero network
> calls, no food database, and no AI behind its "AI Meal Tracker" branding. v2 fixes all
> of that, and is honest about the parts that are estimates. v1 is preserved in
> [`legacy/`](./legacy) — it's part of the project's story.

## What it does

| Screen | What it actually does |
| --- | --- |
| **Onboarding** | Sex, age, height, weight, activity, goal → targets from Mifflin-St Jeor. |
| **Dashboard** | Today's calorie ring and macro bars, plus what's remaining. |
| **Log** | Search ~180 foods, pick a portion, add it. **The headline feature.** |
| **Scan** | Photo → AI estimate → **editable review** → logged. Disables itself honestly when unconfigured. |
| **Plan** | A rule-based (not AI) day of meals built from the food database. |
| **History** | Every previous day you logged, on this device. |
| **Profile** | Edit details, see how targets are computed, export or reset your data. |

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the built app |
| `npm run typecheck` | `tsc -b` — strict, no `any` escapes |
| `npm run lint` | ESLint (type-aware) |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run test:coverage` | Coverage for `lib/` and `data/` |

Icons and the OG image are generated from the design tokens:
`node scripts/generate-icons.mjs`.

## Honesty notes — please read

This project's rule is that it never claims more than it does.

- **No accounts, no server for your data.** Everything you log lives in this browser's
  `localStorage`, on this device. It is never uploaded and nobody else can see it.
  Clearing browser data deletes it. Export it any time from Profile.
- **The food database is approximate.** ~180 common foods at **reference values per
  100 g**, based on widely published composition data for generic foods. Real foods vary
  by cut, brand, ripeness and preparation. Macros may not multiply out to the listed
  calories exactly — whole foods contain fibre, water and (for drinks) alcohol that the
  4/4/9 shorthand doesn't model. **These are estimates for tracking, not clinical data.**
- **AI numbers are always estimates you edit.** Every scanned item goes through a review
  step with its confidence shown. Nothing is logged until you confirm. If the endpoint
  isn't configured, the app says so — it never fabricates a result.
- **The planner is not AI.** It's arithmetic over a hand-picked shortlist of real foods.
  The UI calls it what it is.
- **None of this is medical advice.** The formulas are population-level estimates.

## How targets are calculated

All of it is in [`src/lib/macros.ts`](./src/lib/macros.ts) — pure, and covered by 41 tests.

1. **BMR — Mifflin-St Jeor** (Mifflin MD, St Jeor ST, et al., 1990):
   - male: `10·kg + 6.25·cm − 5·age + 5`
   - female: `10·kg + 6.25·cm − 5·age − 161`
2. **TDEE** = BMR × activity factor — 1.2 / 1.375 / 1.55 / 1.725 / 1.9.
3. **Goal**: cut −20%, maintain 0%, bulk +15%. Floored at 1200 kcal as a safety bound.
4. **Macros**: protein 1.8 g/kg (2.2 g/kg on a cut), fat 25% of calories, carbs take the
   remainder. Atwater factors: 4 / 4 / 9 kcal per g.

No coefficient in that file is invented. Inputs are clamped, and the engine cannot return
NaN or a negative target.

## Stack

Vite · React 18 · TypeScript (strict) · Tailwind · Framer Motion (restrained) ·
lucide-react · Vitest + React Testing Library · vite-plugin-pwa · deployed to Vercel.

## Architecture

```
src/
  app/         AppShell (480px frame + nav), routing, screen transitions
  components/  Button, Card, Field, Segmented, MacroRing, EmptyState, ...
  features/
    onboarding/  dashboard/  log/  scan/  plan/  history/  profile/
  lib/
    macros.ts    BMR/TDEE/macro split — pure, unit-tested
    store.ts     versioned localStorage persistence + migration path
    search.ts    food search & ranking — pure, unit-tested
    plan.ts      rule-based day planner — pure, unit-tested
    api.ts       typed client for /api/analyze-meal
  data/
    foods.ts     ~180 foods, reference values per 100 g
api/
  analyze-meal.ts   Vercel serverless — key stays server-side. NOT YET IMPLEMENTED;
                    the client codes against the contract in docs/API.md, and the app
                    handles its absence (404/503) gracefully.
legacy/        v1, preserved untouched
docs/          BRIEF.md, API.md
```

## PWA & offline

Installable. Everything works offline — the food database, logging, the planner, history
— because it is all local. **Only the AI scan needs the network**, and the service worker
deliberately never caches `/api/`, so an offline scan fails honestly rather than
replaying a stale estimate.

## Deployment

Vercel: static build plus `/api` serverless functions.

- Build: `npm run build` → `dist/`
- SPA rewrites and cache headers: [`vercel.json`](./vercel.json)
- **`ANTHROPIC_API_KEY`** is set as a Vercel environment variable. It is never in the
  repo, never in the bundle, never logged. Without it, `/api/analyze-meal` returns
  `503 { "error": "ai_unconfigured" }` and the app disables scanning gracefully.

See [`docs/API.md`](./docs/API.md) for the endpoint contract.

## Accessibility

Real labels on every control, visible focus rings, ≥44px touch targets, semantic landmarks
and headings, live regions for async results, and `prefers-reduced-motion` honoured (plus
an in-app toggle). Gold-on-dark is used for large text and accents only — buttons invert
to dark-on-gold so small text keeps AA contrast.

## Tests

```bash
npm test        # 252 tests, 13 files
```

Vitest + React Testing Library.

| Area | Tests |
| --- | --- |
| `lib/macros.ts` — the macro engine | 41 |
| `lib/store.ts` — persistence & migration | 35 |
| `lib/api.ts` — the analyze-meal client | 28 |
| `lib/search.ts` — food search & ranking | 27 |
| `data/foods.ts` — data integrity | 20 |
| Scan flow (incl. the 503 path) | 19 |
| `lib/plan.ts` · `lib/date.ts` | 15 · 15 |
| Log flow · routing · profile · onboarding · history | 14 · 13 · 11 · 8 · 6 |

The pure modules are tested for known values and edge cases (NaN, infinities, hostile
input). The screens are tested as real user journeys — including that a logged food
**survives a refresh**, and that a 503 disables scanning without logging anything.

## Licence

Personal portfolio project.
