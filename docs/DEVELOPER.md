# Developer guide — Claire Inventory & Forecasting dashboard

For the engineer who picks this up after the founding team has gone. The
[`README.md`](../README.md) tells you how to install, run and build. This tells
you **how the system is laid out and why**, what each directory is for, the data
model it renders, how to add a typical feature, and how to debug the parts that
are not obvious.

> **Read the state of the repo honestly.** As of `main@93fab9d` this is the
> **S-1 scaffold** — a designed, tested shell, not the finished cockpit. The
> `src/App.tsx` you see is a placeholder; the KPI grid, forecast charts, alert
> lists and PR-recommendation table described in [`DESIGN.md`](../DESIGN.md) are
> mounted by follow-on tickets (S-4 KPI math, S-6 dashboard build). Where this
> guide describes something that is **planned but not yet in the tree**, it says
> so explicitly. Do not assume a file exists because it is named here — check.

---

## 1. What this system is

Claire is the **reporting surface** for the Inventory & Forecasting Cell. It is
a single-page React app that **renders a precomputed analysis bundle** — KPIs,
demand forecasts (3/6/12 months), stock alerts (overstock / understock /
non-moving / slow-moving) and purchase-requisition recommendations — built from
the SAP inventory extract and the forecasting MCP.

The dividing line that shapes the whole codebase:

- **This repo does not compute the analysis at runtime.** It reads a static
  JSON bundle (`public/data/analysis.json`, overridable via `VITE_DATA_URL`)
  and draws it. The heavy lifting — parsing the SAP extract, calling the
  forecasting MCP, computing KPIs and PR timing — happens in a **build-time
  pipeline** (Python fixtures + a Node analysis step) that bakes the bundle.
- **Why:** the dashboard must render fast, deploy as static files behind nginx,
  and never depend on the MCP or SAP being reachable from a browser. The
  forecast is produced upstream and frozen into the bundle. See
  [`docs/DATA_GAP.md`](./DATA_GAP.md) for the mandate that the forecast is
  **never hand-rolled** — it comes from the MCP.

```
SAP extract (.xlsx)  ──►  build pipeline  ──►  public/data/analysis.json  ──►  React app renders
  Inventory_Input          (Python + Node,        { kpis, forecasts,            (Vite build,
  Monthly_Consumption       + forecasting MCP)       alerts, recommendations }    static nginx)
```

---

## 2. Stack and why each piece is here

| Piece | Version | Why it is here |
|---|---|---|
| **Vite 5** | `^5.4.9` | Fast dev server + a static production build (`dist/`) that nginx serves. No SSR — this is a static cockpit. |
| **React 18** | `^18.3.1` | UI. Mounted in `StrictMode` from `src/main.tsx`. |
| **TypeScript (strict)** | `^5.6.3` | `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` all on. A widened type or a silenced error will not pass the gate. |
| **Tailwind CSS 3** | `^3.4.14` | Utility styling driven **entirely by design tokens** (see §5). `darkMode: 'class'`. |
| **Recharts** | `^2.13.0` | Forecast / consumption charts (used by S-6's `ForecastChart`, not yet in the tree). |
| **lucide-react** | `^0.454.0` | One icon set. |
| **Vitest + Testing Library** | `^2.1.3` | Unit tests, jsdom environment, `globals: true`. |
| **ESLint 9 (flat config)** | `^9.39.5` | `eslint.config.js`, typescript-eslint + react-hooks + react-refresh. |

Node **20** is pinned in [`.nvmrc`](../.nvmrc); CI reads it via
`node-version-file`. Use `nvm use` before working locally.

---

## 3. Top-level layout — what each thing holds

```
.
├── index.html               # Vite entry; loads /src/main.tsx, has <div id="root">
├── src/
│   ├── main.tsx             # React root — createRoot(#root).render(<App/>) in StrictMode
│   ├── App.tsx              # App shell. TODAY: a baseline header + placeholder card.
│   │                        #   The real dashboard mounts here (S-6).
│   ├── styles/tokens.css    # Design tokens (CSS vars, light+dark) + @tailwind layers.
│   │                        #   THE source of truth for colour/type/space/radius/motion.
│   ├── lib/                 # Pure, framework-free helpers + their tests.
│   │   ├── format.ts        #   formatInr() — the only shipped logic on main today.
│   │   └── format.test.ts   #   its vitest cases.
│   ├── test/setup.ts        # Vitest setup: imports @testing-library/jest-dom matchers.
│   └── vite-env.d.ts        # Vite client type reference.
├── public/
│   └── data/analysis.json   # The bundle the app fetches at runtime. TODAY: placeholder
│                            #   ({ generatedAt, note, kpis:[], forecasts:[], alerts:[],
│                            #     recommendations:[] }). Populated by the build pipeline.
├── scripts/
│   └── build_fixtures.py    # Emits the raw 18-material extract as JSON fixtures
│                            #   (public/data/extract.rows.json, monthly.json).
│                            #   See §6 — it references build_analysis.mjs + src/lib/kpis.ts
│                            #   which are S-4/S-6 deliverables, NOT yet on main.
├── docs/
│   ├── DEVELOPER.md         # This file.
│   ├── DATA_PROFILE.md      # Expected SAP extract schema, reconciled vs what's present.
│   └── DATA_GAP.md          # Authoritative statement of missing inputs + the 5 data gaps.
├── DESIGN.md                # The design system: tokens, components, states, a11y.
├── README.md                # Install / run / build / configure.
├── CHANGELOG.md             # Notable changes.
├── Dockerfile               # Multi-stage: node build → nginx static serve (SPA fallback).
├── docker-compose.yml       # Runs the built image on :8080.
├── .env.example             # Every env var, documented. Copy to .env for local dev.
├── .nvmrc                   # Node 20.
├── .github/workflows/ci.yml # CI: install → typecheck → lint → test → build.
├── vite.config.ts           # Vite + react plugin + vitest config (jsdom, setupFiles).
├── tailwind.config.js       # Maps tokens.css variables into the Tailwind theme.
├── postcss.config.js        # tailwindcss + autoprefixer.
├── eslint.config.js         # Flat ESLint config.
└── tsconfig*.json           # Project references: app (src) + node (vite.config.ts).
```

### tsconfig split — a common trip-up
There are **three** tsconfigs and it matters which is which:
- `tsconfig.json` — the root **references-only** file; it builds nothing itself,
  it points at the two below. `npm run typecheck` runs `tsc -b` against it.
- `tsconfig.app.json` — the **browser** code (`include: ["src"]`), DOM libs,
  `jsx: react-jsx`, vitest + jest-dom types.
- `tsconfig.node.json` — the **build tooling** (`include: ["vite.config.ts"]`),
  Node libs, no DOM.

If you add a config or script that runs under Node (not in the browser), it
belongs in the `tsconfig.node.json` include, not `app`. Putting a Node file in
`app` gives you spurious "cannot find `process`" or DOM-type errors.

---

## 4. The data model

The app renders one bundle. Its **top-level shape is fixed** (callers depend on
it); the item shapes below follow [`DESIGN.md`](../DESIGN.md) §6 and are being
finalised by S-4/S-6.

### 4.1 The runtime bundle — `public/data/analysis.json`
```jsonc
{
  "generatedAt": "2026-09-23T…",   // ISO timestamp the pipeline stamps; null in the placeholder
  "note": "…",                      // provenance note (mock vs live)
  "kpis": [ /* KpiTile inputs */ ],
  "forecasts": [ /* per material·plant·horizon */ ],
  "alerts": [ /* understock | overstock | non-moving | slow-moving */ ],
  "recommendations": [ /* PR recommendations, ALWAYS advisory — see §4.4 */ ]
}
```
**Contract rule:** never remove or rename a top-level key without updating the
loader and every consumer. Prefer additive changes. The four arrays being empty
is a valid state (no snapshot yet) and every component must render an empty
state for it (DESIGN.md §7).

### 4.2 The source extract — two sheets (see `docs/DATA_PROFILE.md`)
- **`Inventory_Input`** — one row per **material · plant**: material code &
  description, category, material type (`ZSPR` repairable / `ZSPN`
  non-repairable), plant, SM/NM flag, current stock, avg monthly consumption
  (current & FY25), safety stock, reorder point, lead time (days), recent
  monthly consumption columns, unit cost, critical-spare & shutdown-linked flags.
- **`Monthly_Consumption`** — a **12-month** series (2025-10 … 2026-09) per
  material·plant. This is the input series the forecasting MCP consumes.

The fixture in `scripts/build_fixtures.py` encodes this schema exactly for 18
materials (`MAT-1001`…`MAT-1018`) as JSON — `extract.rows.json` and
`monthly.json` — so the app can render on a realistic shape while the real
extract is unavailable. It is **labelled mock input**, never a live SAP feed.

### 4.3 The five structural data gaps (from `docs/DATA_GAP.md`)
These hold **even once the real extract arrives** and every feature must honour
them:
1. **No PR/PO history** → PR timing is derived, recommendations are advisory.
2. **Only monthly aggregate consumption** → no intra-month spikes/backorders.
3. **Long-lead ZSPN spares dominate PR timing** (`MAT-1003/1006/1010/1014/1018`,
   180–300 day lead times, near-zero movement).
4. **12-month history only** → 12-month forecasts extrapolate; report back-test
   accuracy alongside every forecast.
5. **Single stock snapshot (2026-09-01)** → days-on-hand / turnover are
   point-in-time, not rolling.

### 4.4 Why PR recommendations are "advisory"
The extract has **no open POs/PRs**, so the system cannot say "this is already
on order." It derives *recommended qty* and *raise-by date* from `current stock
+ forecast demand over lead time` against `reorder point / safety stock`. The UI
must **label this advisory** (DESIGN.md §6.4) — it is a hard requirement, not a
nicety.

---

## 5. The design-token system — read this before you touch a component

Styling is **token-driven and closed.** A literal colour, size, radius, spacing
value or duration in a component is a **defect** (DESIGN.md, tokens.css header).

- Tokens are CSS custom properties in [`src/styles/tokens.css`](../src/styles/tokens.css),
  defined for `:root` (light) and `.dark`.
- They are mapped into the Tailwind theme in
  [`tailwind.config.js`](../tailwind.config.js), so you use them as ordinary
  utilities: `bg-surface`, `text-fg`, `text-muted`, `border`, `text-accent`,
  `rounded-card`, `rounded-control`, `shadow-e1/e2/e3`, `gap-4`, `h-control`,
  `max-w-page`, `text-2xl` … .
- **Colour tokens are stored as space-separated RGB channels** (`--accent: 79 70
  229`) so Tailwind can apply `<alpha-value>` — that is why you can write
  `bg-accent/10`. If you add a colour, add it the same way in *both* `:root` and
  `.dark`, then map it in the config.
- Dark mode is **designed, not inverted**: it re-tunes surfaces and shadows.
  Toggle by putting `class="dark"` on a root element.
- Numerics use the `.nums` utility (tabular figures) so columns of numbers align.

The **semantic colour mapping is fixed for this domain** (DESIGN.md §4):
understock/NMI → `danger`, SMI/overstock → `warning`, critical-spare available →
`success`, forecast series → `accent`, historic actuals → `muted`. Use those,
don't re-decide per screen.

---

## 6. The build pipeline (fixtures → analysis → bundle)

This is the part that is **partly present and partly planned** — read carefully.

**Present on `main` today:**
- `scripts/build_fixtures.py` — deterministic Python that writes the raw extract
  as `public/data/extract.rows.json` and `public/data/monthly.json`. Run it with
  the sandbox venv:
  ```bash
  python3 scripts/build_fixtures.py
  ```

**Referenced by the fixtures script but NOT yet on `main`** (S-4 / S-6
deliverables — verify before relying on them):
- `src/lib/kpis.ts` — real, tested KPI/alert/PR-timing logic.
- `scripts/build_analysis.mjs` — the Node step that runs `kpis.ts` over the
  fixtures (and, in production, the MCP forecast output) and bakes
  `public/data/analysis.json`.

**The intended flow** once those land:
```
build_fixtures.py ──► extract.rows.json + monthly.json
                          │
   MCP forecast ──────────┤
                          ▼
              build_analysis.mjs ──► public/data/analysis.json ──► app renders
```
When you implement `build_analysis.mjs`, wire it into `npm run build` **before**
`vite build` so the bundle is fresh, and keep all number-crunching in
`src/lib/*.ts` (pure, unit-tested) rather than in the script — the script should
orchestrate, not compute.

---

## 7. How to add a typical feature

Worked example: **add a KPI tile / a new panel to the dashboard.**

1. **Put pure logic in `src/lib/` with a test.** Any computation (a KPI value, a
   formatter, a threshold) goes in `src/lib/<name>.ts` as a pure function, with
   `src/lib/<name>.test.ts` beside it — mirror `format.ts` / `format.test.ts`.
   Test **behaviour**, including the awkward inputs (empty array, non-finite,
   zero-movement material). Write the test first and watch it fail.
2. **Type the data you consume.** Add/extend the bundle types (the shapes in
   §4). Never read an untyped `any` off `analysis.json`.
3. **Build the component from tokens** (§5) and the component inventory in
   `DESIGN.md` §6 — compose existing primitives (KpiTile, Card, Badge, Table…),
   do not introduce a second UI library or hand-roll CSS. Ship **all four
   states**: loading skeleton, empty, error (inline, recoverable), and populated.
4. **Mount it in `src/App.tsx`** (the shell) in its designed grid position.
5. **Run the gates** (§8) and **look at it** — `npm run build && npm run
   preview`, then open the page and read the console (a rendered page can still
   be logging a TypeError).
6. **Respect the contract:** don't change the bundle's top-level keys; keep PR
   recommendations advisory (§4.4).

Adding an **env-configured data source** instead of the static bundle: read
`import.meta.env.VITE_DATA_URL` (already in `.env.example`), fetch it, and add
any new variable to `.env.example` with a comment — the next person runs the app
from that file.

---

## 8. Build, test and run — the gates

Match what CI runs (`.github/workflows/ci.yml`), in this order. A change that
does not pass all five is work in progress.

```bash
nvm use              # Node 20 (.nvmrc)
npm ci               # install from the lockfile (not npm install in CI)
npm run typecheck    # tsc -b   — strict; unused locals/params fail
npm run lint         # eslint . — flat config, src/**/*.{ts,tsx}
npm test             # vitest run
npm run build        # tsc -b && vite build  → dist/
```

Run the dashboard as it is served in production (a **built** app, not the dev
server — the dev server's HMR/error overlay crashes a sandboxed preview iframe):
```bash
npm run build && npm run preview     # serves dist/ on the assigned port
# or the container:
docker compose up --build            # http://localhost:8080
```
Use `npm run dev` / `npm run test:watch` only for your own iteration.

---

## 9. Configuration

All config comes from the environment; **no secrets in git**. Copy
`.env.example` → `.env`. Variables (Vite exposes only `VITE_`-prefixed ones to
the client):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_BASE_PATH` | `/` | Base path the app is served under. |
| `VITE_DATA_URL` | `/data/analysis.json` | Where the app fetches its bundle. Override to point at an API instead of the bundled JSON. |
| `VITE_FORECAST_MCP_URL` | *(blank)* | MCP endpoint **if** the app ever calls it at runtime. Blank in the mock — the forecast is normally baked into the bundle at build time (§6). |

Add any new variable here with a one-line comment when you introduce it.

---

## 10. Debugging the parts that are not obvious

- **Preview iframe crashes with a `SecurityError` ("Blocked a frame … lack the
  allow-same-origin flag")** — you are serving `npm run dev` into the sandboxed
  preview. That is the sandbox doing its job, not an app bug. Serve the
  **production build** (`npm run build && npm run preview`). This is the single
  most common false alarm here.
- **"no checks configured" on a PR** — the branch was cut **before**
  `.github/workflows/ci.yml` merged, so GitHub can't find the workflow on the PR
  head. Rebase the branch onto `main` and the `ci` check attaches. Not a
  pipeline defect (recorded in the CI repo note).
- **CI red — read the log, don't guess.** `github_workflow_runs` for the run,
  then `github_run_logs` on the failed job. The conclusion says *that* it
  failed; the log says *why*. Each gate fails the build on non-zero exit, so the
  failing step names the gate.
- **Typecheck fails on a script/config but not in the editor** — you likely
  added a Node file to the browser project. Check it is covered by
  `tsconfig.node.json`, not `tsconfig.app.json` (§3).
- **Dashboard renders but is empty / all "—"** — expected when
  `analysis.json` still has empty arrays (the placeholder). The bundle is
  populated by the build pipeline (§6); an empty bundle is a valid *no snapshot*
  state, not a bug.
- **A colour/size looks off in dark mode** — it was hardcoded in a component
  instead of read from a token, or the token was added to `:root` but not
  `.dark`. Fix in `tokens.css`, not in the component (§5).
- **`build_fixtures.py` errors on import of a missing module** — it references
  `build_analysis.mjs` / `src/lib/kpis.ts` in its docstring/flow that are S-4/S-6
  work and may not be on your branch yet (§6). Confirm what's actually present
  before wiring the full pipeline.
- **The forecast must never be hand-rolled** — if you find yourself computing a
  trend line in TypeScript, stop. The forecast comes from the connected MCP and
  is baked into the bundle (`docs/DATA_GAP.md`). Hand-rolling it violates the
  cell mandate.

---

## 11. Where the reasoning lives

- [`DESIGN.md`](../DESIGN.md) — the design system: direction, type scale,
  palette, spacing, the full component inventory, states, responsive and a11y.
- [`docs/DATA_GAP.md`](./DATA_GAP.md) — what inputs are missing, the five
  structural data gaps, and what is needed from the commander.
- [`docs/DATA_PROFILE.md`](./DATA_PROFILE.md) — the expected extract schema,
  reconciled against what is actually present.
- The team's `repo_note` entries (structure, CI, per-ticket root causes) carry
  the "why it stalled" history that isn't in the code.

If you work something out about this repo that isn't written down, record it —
the next task starts cold otherwise.
