# DESIGN.md — Claire Inventory & Forecasting dashboard

The design direction the team builds against. Decided before the first screen
so we ship **one product, not several**. No Figma file is connected, so the
direction is derived here and committed as tokens; if a Figma file is added
later it becomes the source of truth and this document is reconciled to it.

Tokens live in [`src/styles/tokens.css`](src/styles/tokens.css) (CSS variables,
light + dark) and are mapped into the Tailwind theme in
[`tailwind.config.js`](tailwind.config.js). **A literal colour, size, radius,
spacing value or duration in a component is a defect** — read a token.

---

## 1. Direction

**"Linear/Vercel-calm" enterprise.** Calm, dense, legible; neutral surfaces
carry the data and a single accent gives the product life and marks the one
primary action per view. This is an operations cockpit — an inventory
controller reads it every morning — so it optimises for *scannability of
numbers and alerts*, not decoration. Enterprise means calm and legible, not
grey and lifeless.

- **Typeface:** Inter, with a `system-ui, -apple-system, 'Segoe UI', sans-serif`
  fallback. Never the browser default serif. Numerics use `tabular-nums`
  (the `.nums` utility) so figures align in tiles, tables and axes.
- **Accent:** indigo (`indigo-600` light / `indigo-400` dark). Used sparingly —
  primary buttons, the active nav/tab, the focus ring, and the *forecast*
  series on charts. Never as a background wash.
- **Reset:** Tailwind preflight. Nothing arrives styled by the user agent.

---

## 2. Type scale

Sizes 12 / 14 / 16 / 20 / 24 / 32. Hierarchy comes from **size + weight +
colour together**, never size alone; secondary text is `--muted`, not merely
smaller.

| Token (`fontSize`) | px  | Weight        | Colour   | Use |
|--------------------|-----|---------------|----------|-----|
| `2xl` (32)         | 32  | 600 semibold  | `fg`     | Page title; **KPI tile value** (`.nums`) |
| `xl` (24)          | 24  | 600 semibold  | `fg`     | Section titles (Forecast, Alerts, Recommendations) |
| `lg` (20)          | 20  | 600 semibold  | `fg`     | Card / panel headings |
| `base` (16)        | 16  | 500 medium    | `fg`     | Emphasised body, section intro |
| `body` (14)        | 14  | 400 regular   | `fg`     | Body, table cells, form labels |
| `caption` (12)     | 12  | 500 medium    | `muted`  | Captions, KPI tile label, table units, chart axes, deltas |

Line height: `--leading-tight` 1.2 for headings and KPI values, `--leading-normal`
1.5 for body. Body line length capped by the centred page container.

---

## 3. Spacing & layout

4px base scale — **4 / 8 / 12 / 16 / 24 / 32 / 48** (`--space-1..12`). Every gap
and padding comes from it; no ad-hoc values. Group by proximity.

- **Page:** centred, `max-width: 1280px` (`max-w-page`), `--page-pad` 24px
  horizontal (16px on phone). Content never runs edge to edge; everything
  aligns to the grid.
- **KPI grid:** 6 tiles — `grid` of 3 columns at ≥1024px, 2 at ≥640px, 1 on
  phone; gap 16px (`gap-4`).
- **Section rhythm:** 32px (`space-8`) between major sections, 24px inside a
  panel, 16px between grouped controls, 8px between a label and its value.
- **Charts / lists side by side** on desktop; stacked on phone.

---

## 4. Palette (both themes)

RGB channels stored as tokens for Tailwind `<alpha-value>`. No pure black on
pure white; borders are the `--border` colour at **12% alpha** (`* { border-color }`).
At most five hues on a screen; semantic colours appear **only where they carry
meaning** (an alert level, a delta direction).

| Role | Light | Dark |
|------|-------|------|
| `surface`   | `#FFFFFF` | `#0F172A` (slate-900) |
| `surface-2` (page bg) | `#F8FAFC` (slate-50) | `#1E293B` (slate-800) |
| `fg` (text) | `#0F172A` | `#F1F5F9` |
| `muted`     | `#64748B` | `#94A3B8` |
| `border`    | slate-900 @12% | slate-200 @12% |
| `accent`    | `#4F46E5` indigo-600 | `#818CF8` indigo-400 |
| `success`   | `#16A34A` | `#4ADE80` |
| `warning`   | `#D97706` | `#FBBF24` |
| `danger`    | `#DC2626` | `#F87171` |
| `info`      | `#0284C7` | `#38BDF8` |

**Semantic mapping for this domain** (fixed so every screen agrees):

- **Understock / at-or-below safety stock** → `danger`
- **Non-moving (NMI)** → `danger`; **slow-moving (SMI)** → `warning`
- **Overstock** → `warning` (capital tied up, not an outage)
- **Critical-spare available** → `success`; **shortfall** → `danger`
- **Forecast accuracy** on target → `success`, degrading → `warning`
- **Historic (actuals) series** on charts → `muted`; **forecast series** → `accent`;
  the 3/6/12-month horizon bands use `accent` at descending alpha (0.24 / 0.16 / 0.10).

Body text contrast ≥ 4.5:1 in both themes. Dark mode is **designed** — depth
from lighter surfaces, softened shadows (`--elev-*` re-tuned in `.dark`), not an
inversion.

---

## 5. Radii, elevation, controls, motion

- **Radii — two:** `--radius-control` 8px (buttons, inputs, selects, chips),
  `--radius-card` 12px (cards, panels, table container).
- **Elevation — three:** `e1` resting cards, `e2` popovers/menus/hover-lift,
  `e3` modals/dialogs. One elevation language across cards and panels.
- **Control heights — one set:** 32 (`sm`), 36 (`md`, default), 40 (`lg`).
  Touch targets ≥ 40px. Every control has hover, focus, active and disabled
  states. Focus is a **2px accent ring at 2px offset** (`:focus-visible`) —
  never removed, never the default.
- **Motion — quiet:** `--motion` 200ms (`--motion-fast` 150ms) on
  `--ease-out`. Hover, open and close only; nothing bounces, nothing moves
  without a user cause. `prefers-reduced-motion` honoured globally.
- **Icons:** lucide-react, one set, 16px inline with `body`/`caption` text,
  20px in headers; stroke matches text weight.

---

## 6. Component inventory

The building blocks screens are assembled from. Engineers compose these; they
do not invent a new one per page. Every component reads tokens and ships all
its states.

### 6.1 KPI tile (`KpiTile`)
The six the business is measured on. A row of stat cards; card = `surface`,
`radius-card`, `e1`, 24px padding.
- **Structure:** `caption` label (muted) · big **`2xl` value** (`.nums`) with
  unit · delta chip (`caption`, `success`/`danger` with ▲/▼) vs prior snapshot ·
  optional target sub-line.
- **The six:** Gross inventory value (INR / ₹Cr) · Days on hand · Turnover (×) ·
  NMI/SMI (count + value) · Forecast accuracy (%) · Critical-spares
  availability (% and count).
- **States:** loading = skeleton block in the tile's exact footprint; empty =
  "—" with a muted "No snapshot yet"; error = inline `danger` caption "Couldn't
  load — retry".

### 6.2 Forecast chart (`ForecastChart`)
Recharts line/area. One per material-or-plant selection, or a small-multiples
grid.
- **Series:** historic actuals (`muted` solid) → forecast (`accent` solid) with
  a confidence band (`accent` @ low alpha). Vertical marker at "today".
- **Horizon toggle:** segmented control **3 / 6 / 12 months** (control-height
  32, active segment = accent). Axes/labels `caption`; `.nums` on values;
  gridlines at border-alpha.
- **States:** loading = skeleton chart area; empty = "No consumption history
  for this material"; error inline.

### 6.3 Alert list (`AlertList`)
Three grouped lists: **Understock**, **Overstock**, **Non-moving / slow-moving**.
- **Row:** status dot (semantic colour per §4) · material code + description ·
  plant chip · the number that triggered it (stock vs ROP / safety stock; last
  consumption) · right-aligned severity badge.
- **Density:** compact rows, 12px vertical padding, divider lines at
  border-alpha, sticky group header.
- **States:** empty = "No understock items — all above reorder point" (a *good*
  empty state, `success` tone); loading skeleton rows; error inline.

### 6.4 PR recommendation table (`PrRecTable`)
The actionable output — when and how much to raise. Table in a `radius-card`
panel, `e1`, sticky header.
- **Columns:** Material · Plant · Category · Current stock · Forecast demand
  over lead time · Reorder point / safety stock · **Recommended qty** ·
  **Raise-by date** · Lead time (days) · Reason.
- **Numerics right-aligned, `.nums`, tabular.** Long-lead ZSPN spares
  (MAT-1003/1006/1010/1014/1018) get a `warning` lead-time badge.
- **Advisory note:** the extract has **no PR/PO history**, so recommendations
  are marked *advisory* (derived from stock + forecast vs ROP/safety stock over
  lead time) — surfaced as a caption on the panel, not hidden.
- **States:** empty = "No purchase requisitions recommended this cycle";
  loading skeleton rows; error inline.

### 6.5 Shared primitives
`Button` (primary=accent / secondary=surface+border / ghost; heights 32/36/40),
`Select` and `SegmentedControl` (plant / category / horizon filters),
`Badge`/`Chip` (semantic + neutral), `Card`/`Panel` (one elevation language),
`Table` (sticky header, divider lines, right-aligned numerics), `Skeleton`,
`EmptyState`, `Toast` (success confirmation), `ThemeToggle` (light/dark).
All read tokens; none ship a browser default.

---

## 7. States, responsive, accessibility

- **Every state designed:** loading is a skeleton in the final layout (not a
  spinner in a void); empty states say what goes here; errors are inline,
  specific and recoverable; success is confirmed (toast / check).
- **Responsive:** intentional at **390px** and **1440px** — KPI grid reflows
  3→2→1, charts and lists stack on phone, table scrolls horizontally within its
  panel; nothing is a shrunken desktop.
- **Accessibility:** keyboard reachable, visible 2px accent focus ring, labelled
  controls, touch targets ≥ 40px, contrast ≥ 4.5:1 re-checked in dark mode.

---

## 8. Stack (brownfield — extend, don't replace)

Vite 5 + React 18 + TypeScript (strict) + Tailwind 3 + Recharts + lucide-react
+ Vitest (from the S-1 baseline). Extend through tokens and variants; do not
introduce a second component library or hand-roll application CSS.

## 9. Data note carried into the design

The SAP extract has **no PR/PO history**. Purchase-requisition timing is
*derived* (stock + forecast demand over lead time vs reorder point / safety
stock) and every recommendation is labelled **advisory** in the UI (§6.4) —
the design states the gap rather than implying an authoritative PR feed.
