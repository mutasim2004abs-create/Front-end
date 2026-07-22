# FitMacro v2 — Project Brief

## Who / why
Built by **Mutasim Abbas**, a software engineering student (Istanbul Atlas University, BSc Software
Engineering, started 2024). FitMacro is one of two flagship portfolio projects — the other is
**VisSort** (React 18 + TypeScript strict + Three.js + 239 Vitest tests + CI/CD to GitHub Pages).
FitMacro v2 must become a genuine **peer of VisSort**: a real, working, tested product — not a UI mock.

Portfolio: https://mutasim-abbas.github.io/mutasim-abbas-portfolio/

## Honest starting point (v1 — what exists today)
v1 is a good-looking but **non-functional prototype**. Two divergent versions exist:
- **Repo version** (`legacy/v1-repo/`, formerly `Front-end/`): index.html + script.js + style.css.
  Screens: login, stats, home, **track**, results, **history**, targets, diet, profile, loading.
- **Local single-file** (`legacy/v1-single-file.html`, from the user's Downloads): 72KB, one file.
  Screens: login, welcome, stats, targets, home, loading, results, profile,
  **diet-purpose → diet-goal → diet-result**.

Verified facts about BOTH v1 versions:
- **Zero persistence** — no localStorage / sessionStorage / IndexedDB anywhere. Refresh = data lost.
- **Zero network** — no fetch / XHR. The "AI Meal Tracker" branding has **no AI** behind it.
- **No food database** — macros are typed in by hand, not logged from real foods.
- Login/register screens are cosmetic; no user is ever stored.

Keep from v1: the **visual identity** (dark + gold), the screen flow ideas, and the diet-planner concept.
Discard: the fake auth, the fake "AI" claim without an implementation.

## v2 decisions (LOCKED by Mutasim, 2026-07-16)
1. **Rebuild properly** — Vite + React 18 + TypeScript (strict) + Tailwind, as a **PWA**.
2. **Real AI** — photo → macros, via a **serverless backend** that keeps the API key secret.
3. **Real food database + search** — the headline feature; log real foods, not hand-typed numbers.
4. Repo renamed `Front-end` → **FitMacro** (https://github.com/Mutasim-Abbas/FitMacro).
5. Deploy to **Vercel** (hosts both the static app and the AI function).

Implied and required (not optional): **real persistence**. Without it this stays a mock.

## Stack (locked)
- **Vite + React 18 + TypeScript (strict)** — mirrors VisSort.
- **Tailwind CSS** — dark + gold design tokens (below).
- **Framer Motion** — restrained motion only (screen transitions, ring fills). No gratuitous animation.
- **lucide-react** — icons.
- **Vitest + React Testing Library** — real tests. Target: meaningful coverage of the macro engine,
  the food search, and the store. VisSort has 239 tests; this should not look unserious next to it.
- **vite-plugin-pwa** — installable, offline-capable (the food DB and logs are local anyway).
- **Vercel** — static build + `/api` serverless functions. No other server.
- Windows dev machine (PowerShell). Keep everything cross-platform; CI runs on ubuntu.

## Design tokens (from v1 — preserve the identity, elevate the execution)
Taken from the real v1 CSS:
- `--black: #0b0b0a`, `--black-soft: #141311`, `--surface: #1a1916`, `--surface-2: #221f1b`,
  `--surface-3: #2a2620`
- `--white: #f7f5f0`, `--gray: #9a958a`, `--gray-soft: #65615a`
- **Gold accent:** `--gold: #d4af37`, `--gold-light: #f0d878`, `--gold-dim: #8a7224`
- `--border: rgba(212,175,55,0.16)`, `--border-strong: rgba(212,175,55,0.32)`
- `--danger: #e2685f`, `--success: #7fc28a`
- Radii: `22px / 14px / 10px`. Ease: `cubic-bezier(.22,1,.36,1)`.
- Background: `radial-gradient(ellipse 120% 80% at 50% -10%, #1c1a15 0%, var(--black) 55%)`
- Layout: mobile-first **app frame, max-width 480px, centered** — it should feel like a real phone app.

## Architecture
```
src/
  app/            # routing + screen shell
  features/
    onboarding/   # sex, age, height, weight, activity, goal
    dashboard/    # today's rings + remaining macros
    log/          # food search + portion + add  ← headline
    scan/         # photo → macros (AI)
    plan/         # diet planner (rule-based, honest)
    history/      # past days
    profile/      # targets, units, data export/reset
  lib/
    macros.ts     # BMR/TDEE (Mifflin-St Jeor), goal splits — PURE, fully unit-tested
    store.ts      # typed persistence (localStorage), versioned schema + migration
    search.ts     # food search/ranking — PURE, unit-tested
  data/
    foods.ts      # curated food database (see below)
api/
  analyze-meal.ts # Vercel serverless: image → macros via Claude. Key stays server-side.
legacy/           # v1 preserved, untouched, clearly labelled
docs/             # this brief + API notes
```

### Macro engine (`lib/macros.ts`) — must be real and correct
- **BMR: Mifflin-St Jeor.** male: `10w + 6.25h − 5a + 5`; female: `10w + 6.25h − 5a − 161`
  (w kg, h cm, a years).
- **TDEE = BMR × activity factor**: sedentary 1.2, light 1.375, moderate 1.55, very 1.725, extra 1.9.
- **Goal**: cut `−20%`, maintain `0`, bulk `+15%` (state the % in the UI — no magic numbers).
- **Macro split**: protein `1.8 g/kg` (cut `2.2 g/kg`), fat `25%` of kcal, carbs = remainder.
  4/4/9 kcal per g for protein/carb/fat.
- Clamp to sane ranges; never return NaN/negative. **These formulas are industry-standard — cite
  Mifflin-St Jeor in the UI/README. Do not invent coefficients.**
- This module is pure and must be **thoroughly unit-tested** (known-value cases + edge cases).

### Food database (`data/foods.ts`) — the headline feature
- Curated set of **~150 common foods**, per **100 g**, fields:
  `{ id, name, category, kcal, protein, carbs, fat, per: 100, commonPortions: [{label, grams}] }`
- Use **well-established reference values** (e.g. chicken breast ≈ 165 kcal / 31 g protein / 0 c / 3.6 f
  per 100 g). Cover: proteins, grains/carbs, dairy, fruit, veg, fats/nuts, snacks, drinks, and a few
  Turkish/Middle-Eastern staples (Mutasim is in Istanbul; Arabic is his native language) — e.g.
  bulgur, lentil soup, hummus, labneh, simit, ayran, dates.
- **Honesty requirement:** label these as *approximate reference values per 100 g*, state the basis in
  the README, and never present them as clinical/medical data. No fabricated precision.
- Search must handle partial matches and be fast; ranking = prefix > substring > category.
  `lib/search.ts` is pure and unit-tested.

### Persistence (`lib/store.ts`)
- `localStorage`, single versioned key (e.g. `fitmacro.v2`), typed schema + migration path.
- Stores: profile/targets, per-day log entries, settings.
- Must survive refresh (this is the #1 thing v1 got wrong). Include export + reset in Profile.
- No accounts, no server-side user data — say so plainly in the UI (replaces the fake login).

### AI endpoint (`api/analyze-meal.ts`) — Vercel serverless (Node, TypeScript)
Use the **official Anthropic TypeScript SDK** (`@anthropic-ai/sdk`) — never raw fetch, never an
OpenAI-compatible shim.

Contract (document in `docs/API.md`):
- `POST /api/analyze-meal` · body `{ imageBase64: string, mediaType: "image/jpeg"|"image/png"|"image/webp" }`
- 200 → `{ items: [{ name, grams, kcal, protein, carbs, fat, confidence }], totals: {...}, note: string }`
- 400 invalid input · 413 too large · 429 rate limited · 503 `{ error: "ai_unconfigured" }` when no key
- Implementation requirements:
  - Model **`claude-opus-4-8`** (exact string). `max_tokens: 16000`.
  - `thinking: { type: "adaptive" }` (adaptive is the only on-mode; do NOT use `budget_tokens` — it
    400s on Opus 4.8). Do NOT send `temperature`/`top_p`/`top_k` — they 400 on Opus 4.8.
  - **Structured outputs**: `output_config: { format: { type: "json_schema", schema } }` (or
    `client.messages.parse()` with `zodOutputFormat`). Do NOT use the deprecated `output_format`.
  - Vision: base64 image content block placed **before** the text block.
  - Read the key from `process.env.ANTHROPIC_API_KEY`. **Never** ship it to the client, never log it,
    never put it in the repo. If unset → return 503 `ai_unconfigured` (app must still work fully).
  - Guardrails: max ~5 MB image; basic per-IP rate limit; reject non-image media types;
    catch typed SDK errors (`Anthropic.RateLimitError`, `Anthropic.APIError`) — no string matching.
  - Prompt the model to **estimate honestly** and return a `confidence` per item; instruct it to say
    when it cannot tell. The UI must present AI numbers as **estimates the user can edit**, never as
    fact. Every scanned item lands in an editable review step before it is logged.
- Client-side: if `/api/analyze-meal` returns 503, hide/disable the scan feature with an honest message
  ("AI scanning isn't configured on this deployment") — never crash, never fake a result.

## Non-negotiables
- **No fake anything.** No fabricated live links, no fake auth, no invented nutrition precision, no
  "AI" label on non-AI code. If a feature isn't wired, say so in the UI.
- **The API key never reaches the client.** Only `process.env` in the serverless function.
- Accessible: labelled controls, focus-visible, ≥44px touch targets, `prefers-reduced-motion`,
  AA contrast against the dark theme (watch gold-on-dark for small text).
- Responsive: real phone app feel at 480px, still sane on desktop.
- `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` must all pass. CI enforces it.
- Preserve v1 in `legacy/` — it's Mutasim's work and part of the project's story.

## Definition of done
1. Onboard → targets computed from real formulas → persisted.
2. Search the food DB, add a portion → today's macros update → **survives refresh**.
3. Photo scan → editable review → logged (or an honest 503 message when no key).
4. Diet planner produces a real, goal-appropriate day of meals from the food DB.
5. History shows previous days.
6. Installable PWA; works offline for everything except the AI scan.
7. Tests green, build green, deployed to Vercel, portfolio card updated.
