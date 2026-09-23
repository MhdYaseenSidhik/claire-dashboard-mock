# Changelog

## S-1 — repository baseline (scaffold)

`claire-dashboard-mock` began as an **empty repository** (no commits). This
change establishes the production baseline the Inventory & Forecasting Cell
builds the dashboard on:

- Vite 5 + React 18 + TypeScript (strict) + Tailwind 3 with design tokens
- Recharts + lucide-react
- Vitest + Testing Library, with a covered util (`src/lib/format.ts`)
- README with real commands, `.env.example`, `.nvmrc`, `.gitignore`
- Dockerfile (build + nginx static serve) and docker-compose
- CI pipeline staged at `ci/ci.yml` (see `ci/README.md` for activation)

Follow-on tickets wire the SAP-extract analysis, MCP forecasts, KPIs, alerts
and purchase-requisition recommendations into `src/App.tsx`.
