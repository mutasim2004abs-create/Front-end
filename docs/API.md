# FitMacro API

One endpoint. It exists so the Anthropic API key can stay on the server — the browser
never sees it.

> **Status: implemented.** `api/analyze-meal.ts` (+ `api/_lib/`) serves this contract, and
> both sides are tested — the client in `src/lib/api.ts`, the function in
> `api/analyze-meal.test.ts` and `api/_lib/*.test.ts`. Tests mock the Anthropic SDK: they
> never make a real API call and never need a key.
>
> **The AI scan is off until an `ANTHROPIC_API_KEY` is set in the deployment.** That is a
> supported state, not a broken one: the function returns `503 ai_unconfigured`, scanning
> disables itself with an honest message, and everything else (food database, logging,
> planner, history) keeps working offline.

---

## `POST /api/analyze-meal`

Estimates the macros in a photo of a meal.

### Request

```jsonc
{
  "imageBase64": "iVBORw0KGgo...", // raw base64, NO "data:image/jpeg;base64," prefix
  "mediaType": "image/jpeg"        // "image/jpeg" | "image/png" | "image/webp"
}
```

Constraints enforced by the client before it sends (`src/lib/api.ts`):

| Rule | Value |
| --- | --- |
| Max decoded image size | 5 MB (`MAX_IMAGE_BYTES`) |
| Allowed media types | `image/jpeg`, `image/png`, `image/webp` |

The server must re-check both; the client check is a courtesy, not a security boundary.

### 200 — success

```jsonc
{
  "items": [
    {
      "name": "Grilled chicken breast",
      "grams": 150,
      "kcal": 248,
      "protein": 46,
      "carbs": 0,
      "fat": 5,
      "confidence": 0.85   // 0..1, the model's own stated confidence
    }
  ],
  "totals": { "kcal": 248, "protein": 46, "carbs": 0, "fat": 5 },
  "note": "Portion size estimated from the plate; the rice may be under-counted."
}
```

Client behaviour on 200:

- Items with a blank `name` are dropped.
- Negative or non-numeric macros are coerced to `0`.
- `confidence` is clamped to `0..1`, defaulting to `0` when absent.
- `totals` is recomputed from `items` if the server omits it.
- **Zero items is not an error status**, but the UI reports "no food identified" and logs
  nothing rather than logging zeroes.
- Every number lands in an **editable review step**. Nothing is logged without the user
  pressing confirm.

### Error responses

| Status | Body | Client `kind` | What the user sees |
| --- | --- | --- | --- |
| 400 | `{ "error": "invalid_input" }` | `invalid_input` | "That image couldn't be read." |
| 413 | `{ "error": "too_large" }` | `too_large` | "That photo is too large (5 MB max)." |
| 429 | `{ "error": "rate_limited" }` | `rate_limited` | "Too many scans right now." |
| 503 | `{ "error": "ai_unconfigured" }` | `ai_unconfigured` | **Feature disabled** with an honest message |
| 404 | (endpoint not deployed) | `not_deployed` | Same as 503 |
| 5xx | any | `server` | "The scan failed on the server. Nothing was logged." |
| — | network failure | `network` | "Couldn't reach the server." |
| — | non-JSON / malformed 200 | `malformed_response` | "The server sent back something unexpected." |

### The 503 contract — important

When `ANTHROPIC_API_KEY` is unset, the function **must** return:

```json
{ "error": "ai_unconfigured" }
```

with status `503`. It must not throw, must not return a fake result, and must not 500.

On receiving it the client:

1. Shows "AI scanning isn't configured on this deployment" and points the user to the
   food database instead.
2. Removes the uploader, and remembers the state **in memory for the session**
   (`src/features/scan/availability.ts`) so the user is not invited to fail again.
3. Deliberately does **not** persist that flag — a redeploy that adds the key should not
   have to fight a stale value in someone's localStorage.

A `404` is treated identically, so the app behaves correctly before the function ships.

---

## Server implementation notes

These are requirements from `docs/BRIEF.md`, restated here for whoever builds the
function. The frontend does not depend on them beyond the contract above.

- Use the official **`@anthropic-ai/sdk`**. Never raw `fetch`, never an OpenAI shim.
- Model **`claude-opus-4-8`** exactly. `max_tokens: 16000`.
- `thinking: { type: "adaptive" }`. Do **not** send `budget_tokens` — it 400s on Opus 4.8.
- Do **not** send `temperature` / `top_p` / `top_k` — they 400 on Opus 4.8.
- Structured output via `output_config: { format: { type: "json_schema", schema } }`
  (or `client.messages.parse()` with `zodOutputFormat`). Not the deprecated `output_format`.
- Vision: the base64 image content block goes **before** the text block.
- Key from `process.env.ANTHROPIC_API_KEY`. Never logged, never returned, never bundled.
- Guardrails: ~5 MB cap, per-IP rate limit, reject non-image media types.

### Guardrails as built

| Guardrail | Implementation |
| --- | --- |
| Size | Rejected from the base64 length *before* decoding, then re-checked on the decoded buffer. 5 MB. |
| Media type | Allowlist (`jpeg`/`png`/`webp`) **and** magic-byte sniffing — the declared type must match the actual bytes, so arbitrary content can't be relabelled and forwarded upstream. |
| Base64 | Strict alphabet check first. `Buffer.from(s, 'base64')` silently discards junk, so it can "succeed" on non-base64 input. |
| Method | Non-POST → 405 with `Allow: POST`. |
| Key | Read from `process.env` only; checked before the body is even parsed. Never logged, returned, or bundled. |
| Timeout | 50s client-side, under the 60s `maxDuration` set for `api/**` in `vercel.json`. Without that setting Vercel would kill the function at its 10s default — a vision call with adaptive thinking does not reliably finish in 10s. |

**Rate limiting — honest limitation.** The limiter (`api/_lib/rate-limit.ts`) is a fixed
window held **in the memory of a single serverless instance**. Vercel runs many instances
and recycles them freely, so the real ceiling is roughly
`10 requests/min × active instances`, and any cold start resets the count to zero. It is a
courtesy brake against one client hammering the scan button — **not** a durable defence
against a determined attacker. Durable limiting needs shared state (Vercel KV / Upstash).
This is documented rather than papered over.
- Catch typed SDK errors (`Anthropic.RateLimitError`, `Anthropic.APIError`) — no string
  matching on error messages.
- Prompt the model to estimate honestly, return a per-item `confidence`, and say in
  `note` when it cannot tell. The UI presents all of it as an estimate.

## Client reference

| Export | Purpose |
| --- | --- |
| `analyzeMeal({ imageBase64, mediaType, signal })` | POSTs and returns a parsed `AnalyzeMealResponse`. Throws `AnalyzeError`. |
| `AnalyzeError` | Typed error carrying `kind` and `isFeatureUnavailable`. |
| `analyzeErrorMessage(error)` | User-facing copy for every `kind`. |
| `parseAnalyzeResponse(payload)` | Validates an untrusted response body. |
| `parseDataUrl(dataUrl)` | Splits a data URL into `{ base64, mediaType }`. |
| `fileToDataUrl(file)` | Reads a `File` into a data URL. |

Covered by `src/lib/api.test.ts` and `src/features/scan/ScanScreen.test.tsx`.
