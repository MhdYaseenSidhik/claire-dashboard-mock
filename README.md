# Claire — Inventory &amp; Forecasting Dashboard (mock)

The reporting surface for the **Inventory &amp; Forecasting Cell**: KPI cockpit,
demand forecasts (3/6/12 months), stock alerts (overstock / understock /
non-moving / slow-moving) and purchase-requisition recommendations, built from
the SAP inventory extract and the forecasting MCP output.

> This is the dashboard shell. The analysis, forecast and KPI computation are
> produced by the cell and wired in by the follow-on tickets; this repo renders
> the resulting data bundle.

## Stack

- **Vite 5** + **React 18** + **TypeScript** (strict)
- **Tailwind CSS 3** with design tokens in `src/styles/tokens.css`
- **Recharts** for forecast/consumption charts, **lucide-react** for icons
- **Vitest** + Testing Library for tests

## Commands

| Task | Command |
|------|---------|
| Install | `npm install` (or `npm ci` with a lockfile) |
| Dev server | `npm run dev` |
| Type-check | `npm run typecheck` |
| Test | `npm test` |
| Build (production) | `npm run build` |
| Preview production build | `npm run preview` |

Node 20 (see `.nvmrc`).

## Serving the production build

The live preview must serve a **production build**, not the dev server:

```bash
npm run build
npm run preview   # serves dist/ on the assigned port
```

Or via Docker:

```bash
docker compose up --build   # http://localhost:8080
```

## Configuration

Copy `.env.example` to `.env`. The dashboard reads a precomputed analysis
bundle (KPIs, forecasts, alerts, PR recommendations) — default
`public/data/analysis.json`, overridable with `VITE_DATA_URL`.

## Layout

```
.
├── index.html              # app entry
├── src/
│   ├── main.tsx            # React root
│   ├── App.tsx             # app shell (dashboard mounts here)
│   ├── styles/tokens.css   # design tokens + tailwind base
│   ├── lib/                # pure helpers (formatting, KPI math) + tests
│   └── test/setup.ts       # vitest setup
├── public/data/            # analysis bundle consumed by the dashboard
├── Dockerfile              # build + nginx static serve
├── docker-compose.yml
└── .github/workflows/ci.yml # CI pipeline (install → typecheck → lint → test → build)
```

## Developer guide

Beyond this README, [`docs/DEVELOPER.md`](docs/DEVELOPER.md) covers how the
system is laid out and why, the data model, how to add a typical feature, and
how to debug the parts that are not obvious — written for the engineer who
joins later.

## Data source &amp; known gaps

Input is the SAP extract `mock_inventory_input_data.xlsx` (sheets
`Inventory_Input`, `Monthly_Consumption`). **The extract contains no PR/PO
history**, so purchase-requisition timing is derived from stock + forecast
demand over lead time against reorder point / safety stock, not from open POs.
Very long lead times on ZSPN spares (MAT-1003/1006/1010/1014/1018) drive the PR
timing logic.
