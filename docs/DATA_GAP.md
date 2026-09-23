# INV-2 — Extract analysis & data-gap statement

**Ticket:** S-2 (INV-2) · **Owner:** Robin (Scrum Master / PO) · **Status of inputs verified:** 2026-09-23
**Ticket:** S-2 (INV-2) · **Owner:** Robin (Scrum Master / PO) · **Status of inputs verified:** 2026-09-22

This is the authoritative statement of **what the analysis pipeline needs, what
is actually present, and what is missing** — so that no downstream ticket
(KPIs, forecast, PR recommendations, insight pack) is built on an assumption
about data that was never delivered. It records facts checked this session, not
intentions.

---

## 1. The intended input

Per the cell brief and the repo README/DESIGN, the analysis runs from a single
SAP extract:

- **File:** `mock_inventory_input_data.xlsx`
- **Sheet `Inventory_Input`** — one row per material·plant with: material code &
  description, category, material type (ZSPR / ZSPN), plant, SM/NM flag,
  current stock, average monthly consumption (current & FY25), safety stock,
  reorder point, lead time (days), recent monthly consumption columns, unit
  cost, critical-spare and shutdown-linked flags.
- **Sheet `Monthly_Consumption`** — a 12-month consumption series per
  material·plant (window **2025-10 … 2026-09**), the history the forecasting
  MCP consumes.

The forecasting engine is the **connected MCP** (`mcp_*` tools). The cell
mandate is explicit: **the forecast is produced by the MCP; it is never
hand-rolled.**

## 2. What is actually available (verified this session)

| Input | Expected | Actual | Evidence |
|-------|----------|--------|----------|
| SAP extract `mock_inventory_input_data.xlsx` | Attached to the session or in OneDrive/SharePoint | **ABSENT** | Re-verified 2026-09-23 with M365 connected: OneDrive/SharePoint search (`mock_inventory_input_data`, `inventory extract xlsx`, `SAP inventory consumption`, `.xlsx`) → no matching file (only unrelated `online_retail_II.xlsx` and streamlit build artifacts); Shared-with-me → 0 items; mail search `inventory extract` → no attachment; not in the repo or workspace |
| Forecasting MCP (`mcp_*` tools) | Connected in Integrations | **NOT CONNECTED** | No `mcp_*` tool exists in the session toolset |
| Repo data bundle `public/data/analysis.json` | Populated KPIs/forecasts/alerts/recs | **Placeholder** — `kpis/forecasts/alerts/recommendations` all `[]` | `cat public/data/analysis.json` on this branch |
| Sandbox (git/node/python) | Able to build & test | **Healthy** | checkout, `git log`, drive/mail lookups all succeed this session |
| SAP extract `mock_inventory_input_data.xlsx` | Attached to the session or in OneDrive/SharePoint | **ABSENT** | OneDrive search (`mock_inventory_input_data`, "inventory input consumption SAP extract") → 0 results; Shared-with-me → 0 items; not in the repo or workspace |
| Forecasting MCP (`mcp_*` tools) | Connected in Integrations | **NOT CONNECTED** | No `mcp_*` tool exists in the session toolset |
| Repo data bundle `public/data/analysis.json` | Populated KPIs/forecasts/alerts/recs | **Placeholder** — `kpis/forecasts/alerts/recommendations` all `[]` | `git show` on `main` |
| Sandbox (git/node/python) | Able to build & test | **Healthy** | checkout, `git log`, `find` all succeed this session |

## 3. Confirmed data gaps (structural — hold even once the extract arrives)

These are properties of the data model itself, not of the current missing-file
situation. They must be honoured by every downstream ticket:

1. **No PR/PO history.** The extract carries no open purchase requisitions or
   purchase orders. **Consequence:** purchase-requisition timing cannot be read
   from an SAP PR feed — it must be **DERIVED** (current stock + forecast demand
   over lead time, against reorder point / safety stock). **Every PR
   recommendation is therefore advisory** and must be labelled as such in the
   UI and the insight pack.

2. **No goods-movement / issue-document detail.** Consumption arrives only as a
   monthly aggregate (`Monthly_Consumption`), not as individual issues.
   **Consequence:** intra-month spikes, reservations and backorders are
   invisible; demand variability for safety-stock statistics is
   coarse-grained.

3. **Long-lead ZSPN spares dominate PR timing.** MAT-1003 / 1006 / 1010 / 1014 /
   1018 have lead times of **180–300 days** and near-zero movement (SM/NM).
   **Consequence:** for these, PR timing is driven by lead time and criticality,
   not by consumption trend; a naive reorder-point rule will mis-time them.

4. **12-month history only.** The consumption window is a single year
   (2025-10 … 2026-09). **Consequence:** seasonality can be observed but not
   validated across years; 12-month forecasts extrapolate beyond the observed
   window and carry wider uncertainty — back-test accuracy must be reported
   alongside every forecast.

5. **Single snapshot date (2026-09-01).** Stock is a point-in-time value.
   **Consequence:** days-on-hand and turnover are computed against that snapshot;
   they are not a rolling average.

## 4. What is blocked, and on what

- **S-3 (INV-3 Forecast via MCP)** is blocked and remains blocked. It needs
  **both** external inputs above: the **MCP connected** (mandate forbids
  hand-rolling a forecast) **and** the **extract attached** (the MCP's input
  series). Neither is resolvable from this seat. This was re-verified this
  session; ruled out as causes: sandbox subprocess exhaustion (an earlier
  session hit `fork: Resource temporarily unavailable`; git/node/python run
  fine now) and any code/build/dependency defect (the repo is a clean S-1
  scaffold, tree clean).

- **S-4 (KPIs, alerts, PR recs)** can be *coded* against the schema above, but
  cannot produce real numbers until the extract lands. PR recs must be built
  **advisory-by-design** because of gap (1).

## 5. What we need from the commander

To unblock the numbers end to end, two things — nothing else is missing:

1. **Attach the SAP extract** `mock_inventory_input_data.xlsx` (sheets
   `Inventory_Input`, `Monthly_Consumption`) to the session, or give a
   OneDrive/SharePoint path or link.
2. **Connect the forecasting MCP** in Integrations so its `mcp_*` tools are
   available to the forecast run.

With both in place, S-3 completes without further input: MCP forecast over
`Monthly_Consumption` → `forecasts.json` keyed material·plant·horizon (3/6/12
mo) with the MCP's model name and back-test accuracy → baked into
`analysis.json`.

---

### Note on the fixture in `scripts/build_fixtures.py`

A deterministic 18-material fixture (MAT-1001…1018) exists so the dashboard can
render on a realistic shape while the real extract is unavailable. It is
**clearly labelled mock input**, encodes the brief's schema exactly, and is
never presented as a live SAP feed or an MCP forecast. It is a rendering aid,
**not** a substitute for the real extract, and does not close any gap in
section 3.
