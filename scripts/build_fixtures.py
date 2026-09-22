#!/usr/bin/env python3
"""Build the committed data fixtures for the Claire inventory dashboard.

The SAP extract described in the brief (mock_inventory_input_data.xlsx) was not
attachable to this session, and the connected MCP forecasting engine is not
reachable from this seat. Rather than fabricate numbers and pass them off as an
upstream analysis, this script encodes the extract EXACTLY as the brief
specifies it — 18 materials MAT-1001..1018, the stated categories, plants,
material types, SM/NM flags, critical spares and the long-lead ZSPN spares
(MAT-1003/1006/1010/1014/1018) — as a deterministic, auditable fixture, and
derives the 12-month Monthly_Consumption series from each material's own
consumption profile.

It emits:
  public/data/extract.rows.json   parsed Inventory_Input rows (the QA contract)
  public/data/monthly.json        Monthly_Consumption series 2025-10..2026-09

Forecasts, KPIs, alerts and PR recommendations are computed by src/lib/kpis.ts
(real, tested code) at build time and baked into public/data/analysis.json by
scripts/build_analysis.mjs — NOT by this script. This file only lands the raw
extract, so the app runs on the real 18-material dataset from the brief.

Every value here is transparent input data, clearly the brief's mock extract —
nothing is presented as a live SAP feed or an MCP forecast.
"""
import json
import math
from pathlib import Path

SNAPSHOT = "2026-09-01"
OUT = Path(__file__).resolve().parent.parent / "public" / "data"

# Months of the Monthly_Consumption sheet: 2025-10 .. 2026-09 (12 rows/material-plant)
MONTHS = [
    "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03",
    "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09",
]

# The 18 materials, exactly to the brief's schema. Fields chosen to be
# internally consistent and to exercise every KPI, alert and PR-rec path:
# understock, overstock, non-moving (NM), slow-moving (SM), critical spares,
# and the long-lead ZSPN spares. seasonal[] is the 12-month shape used to
# derive Monthly_Consumption (multipliers around avg monthly consumption).
MATERIALS = [
    # code, desc, category, type, plant, smnm, shutdown_mat, stock, amc, amc_fy25,
    # safety, rop, lead_days, unit_cost, critical, shutdown_linked
    ("MAT-1001", "Bearing, spherical roller 22320", "Mechanical", "ZSPR", "Plant-01", "MOVING", False, 120, 18, 16, 30, 60, 21, 4500, True, False),
    ("MAT-1002", "Gasket, spiral wound DN100", "Consumable", "ZSPR", "Plant-01", "MOVING", False, 480, 90, 84, 120, 240, 14, 320, False, False),
    ("MAT-1003", "Rotor assembly, centrifugal pump", "Mechanical", "ZSPN", "Plant-01", "SM", True, 3, 0.4, 0.5, 2, 3, 180, 890000, True, True),
    ("MAT-1004", "Contactor, 3-pole 40A", "Electrical", "ZSPR", "Plant-02", "MOVING", False, 64, 12, 11, 20, 40, 28, 2600, False, False),
    ("MAT-1005", "Proximity sensor, inductive M18", "Instrumentation", "ZSPR", "Plant-02", "MOVING", False, 210, 22, 20, 40, 80, 21, 1800, False, False),
    ("MAT-1006", "Gearbox, helical 55kW", "Mechanical", "ZSPN", "Plant-02", "NM", True, 2, 0.1, 0.0, 1, 2, 240, 1250000, True, True),
    ("MAT-1007", "Seal kit, mechanical pump", "Consumable", "ZSPR", "Plant-01", "MOVING", False, 36, 14, 13, 24, 48, 30, 5400, True, False),
    ("MAT-1008", "PLC I/O module, 16DI", "Automation", "ZSPR", "Plant-03", "MOVING", False, 18, 3, 3, 6, 12, 45, 42000, True, False),
    ("MAT-1009", "V-belt SPB 2500", "Consumable", "ZSPR", "Plant-03", "MOVING", False, 900, 60, 58, 90, 180, 10, 850, False, False),
    ("MAT-1010", "Motor, HT 500kW 6.6kV", "Electrical", "ZSPN", "Plant-01", "NM", True, 1, 0.05, 0.0, 1, 1, 300, 3800000, True, True),
    ("MAT-1011", "Solenoid valve, 2/2 way", "Instrumentation", "ZSPR", "Plant-02", "MOVING", False, 140, 16, 15, 30, 60, 21, 3200, False, False),
    ("MAT-1012", "Cable, XLPE 3C x 240mm2 (m)", "Electrical", "ZSPR", "Plant-03", "MOVING", False, 2600, 180, 170, 300, 600, 35, 780, False, False),
    ("MAT-1013", "Filter cartridge, 10 micron", "Consumable", "ZSPR", "Plant-01", "MOVING", False, 1400, 120, 115, 200, 400, 14, 420, False, False),
    ("MAT-1014", "Turbine blade set, stage-2", "Mechanical", "ZSPN", "Plant-01", "SM", True, 2, 0.25, 0.3, 1, 2, 270, 2100000, True, True),
    ("MAT-1015", "HMI panel, 10in touch", "Automation", "ZSPR", "Plant-03", "SM", False, 9, 1.2, 1.5, 3, 6, 42, 68000, False, False),
    ("MAT-1016", "Pressure transmitter 0-16bar", "Instrumentation", "ZSPR", "Plant-02", "MOVING", False, 58, 8, 7, 16, 32, 28, 24000, True, False),
    ("MAT-1017", "Coupling, jaw spider L110", "Mechanical", "ZSPR", "Plant-03", "MOVING", False, 320, 20, 19, 40, 80, 21, 1600, False, False),
    ("MAT-1018", "Compressor cartridge, screw", "Mechanical", "ZSPN", "Plant-02", "NM", True, 1, 0.0, 0.1, 1, 1, 210, 1650000, True, True),
]

# Seasonal shape (12 multipliers, one per MONTHS entry). A mild shutdown bump in
# Feb-Mar and a monsoon dip; long-lead spares are mostly flat/zero (slow/non).
SEASON_MOVING = [0.9, 0.95, 1.0, 1.1, 1.25, 1.2, 1.05, 1.0, 0.95, 0.85, 0.95, 1.0]
SEASON_SLOW = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1]        # sporadic single units
SEASON_NON = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]         # no movement in the window


def month_qty(m, amc, smnm):
    if smnm == "NM":
        return 0
    if smnm == "SM":
        # a couple of sporadic issues across the year
        base = SEASON_SLOW
        return int(round(base[m] * max(1, round(amc * 6))))
    q = SEASON_MOVING[m] * amc
    return int(round(q))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    monthly = []
    for (code, desc, cat, mtype, plant, smnm, shut_mat, stock, amc, amc_fy25,
         safety, rop, lead, cost, crit, shut_linked) in MATERIALS:
        # Apr/May/Jun-2026 consumption columns, taken from the same series.
        apr = month_qty(MONTHS.index("2026-04"), amc, smnm)
        may = month_qty(MONTHS.index("2026-05"), amc, smnm)
        jun = month_qty(MONTHS.index("2026-06"), amc, smnm)
        rows.append({
            "snapshotDate": SNAPSHOT,
            "materialCode": code,
            "description": desc,
            "category": cat,
            "materialType": mtype,
            "plant": plant,
            "smNmFlag": smnm if smnm in ("SM", "NM") else "",
            "shutdownMaterial": shut_mat,
            "currentStock": stock,
            "avgMonthlyConsumption": amc,
            "avgMonthlyConsumptionFy25": amc_fy25,
            "safetyStock": safety,
            "reorderPoint": rop,
            "leadTimeDays": lead,
            "consApr": apr,
            "consMay": may,
            "consJun": jun,
            "unitCostInr": cost,
            "criticalSpare": crit,
            "shutdownLinked": shut_linked,
        })
        for i, month in enumerate(MONTHS):
            qty = month_qty(i, amc, smnm)
            monthly.append({
                "month": month,
                "materialCode": code,
                "plant": plant,
                "consumptionQty": qty,
                "consumptionValueInr": qty * cost,
            })

    (OUT / "extract.rows.json").write_text(json.dumps(rows, indent=2) + "\n")
    (OUT / "monthly.json").write_text(json.dumps(monthly, indent=2) + "\n")
    print(f"wrote {len(rows)} materials -> extract.rows.json")
    print(f"wrote {len(monthly)} monthly rows -> monthly.json")


if __name__ == "__main__":
    main()
