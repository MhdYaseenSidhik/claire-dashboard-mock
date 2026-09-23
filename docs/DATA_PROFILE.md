# INV-2 — Data profile of the SAP inventory extract

**Ticket:** S-2 (INV-2) · **Owner:** Robin (Scrum Master / PO) · **Verified:** 2026-09-23

This profiles the **expected schema of the SAP extract** and reconciles it
against **what is actually present in the session** as of the date above. It is
the companion to [`DATA_GAP.md`](./DATA_GAP.md), which states the consequences
and what is needed from the commander. Read both together.

> **Status of the source file:** `mock_inventory_input_data.xlsx` is **NOT
> present** this session (OneDrive/SharePoint/Shared-with-me/mail all searched,
> 2026-09-23). This profile therefore describes the **agreed schema** from the
> cell brief and README/DESIGN, and marks every field as *un-observed* until
> the extract lands. No field values are invented here.

## Sheet `Inventory_Input` — one row per material · plant

| Column (logical) | Type | Notes |
|---|---|---|
| Material code | string | e.g. `MAT-1001` … `MAT-1018` (18 materials per brief) |
| Material description | string | free text |
| Category | string | material category |
| Material type | enum | `ZSPR` (repairable) / `ZSPN` (non-repairable) spare |
| Plant | string | 3 plants per brief |
| SM/NM flag | enum | slow-moving / non-moving indicator |
| Current stock | number | on-hand at snapshot |
| Avg monthly consumption (current) | number | current run-rate |
| Avg monthly consumption (FY25) | number | prior-year run-rate |
| Safety stock | number | |
| Reorder point | number | |
| Lead time (days) | number | 180–300 for long-lead ZSPN spares |
| Recent monthly consumption cols | number × N | recent months, per material |
| Unit cost | number (₹) | for valuation |
| Critical-spare flag | boolean | drives criticality/availability KPI |
| Shutdown-linked flag | boolean | |

## Sheet `Monthly_Consumption` — 12-month series per material · plant

| Column | Type | Notes |
|---|---|---|
| Material code | string | join key to `Inventory_Input` |
| Plant | string | join key |
| 2025-10 … 2026-09 | number × 12 | monthly consumption; the MCP's input series |

- **Window:** single year, 2025-10 … 2026-09 (12 points).
- **Snapshot date for stock:** 2026-09-01.

## Reconciliation — expected vs present

| Element | Expected | Present this session | Evidence |
|---|---|---|---|
| `Inventory_Input` sheet | 18 rows × attributes above | **Un-observed** — file absent | drive/mail search 2026-09-23 → no match |
| `Monthly_Consumption` sheet | 18 series × 12 months | **Un-observed** — file absent | as above |
| PR/PO history | (not part of extract) | **Absent by design** | brief; see gap 1 in DATA_GAP.md |
| Forecasting MCP | connected | **Not connected** | no `mcp_*` tool in toolset |

## Verdict

The **schema is well-defined and agreed**; the **data is not yet present**. Any
KPI or forecast computed now would be against the labelled mock fixture
(`scripts/build_fixtures.py`), **not** the live SAP extract. Downstream tickets
must honour the five structural gaps in `DATA_GAP.md`, chief among them: **no
PR/PO history → all purchase-requisition recommendations are advisory.**
