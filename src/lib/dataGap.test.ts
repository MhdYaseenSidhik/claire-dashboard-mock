import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// S-2 (INV-2) — Extract analysis & data-gap statement.
// These cases pin the ticket's acceptance criteria so a reviewer no longer has
// to read the two documents by hand to know they still say what they must.
// They assert against the delivered files as they sit in the repository; the
// docs are the deliverable, so the checks describe their required shape, not a
// prose summary of it.

const root = process.cwd();
const dataGapPath = resolve(root, 'docs/DATA_GAP.md');
const dataProfilePath = resolve(root, 'docs/DATA_PROFILE.md');

const read = (p: string) => readFileSync(p, 'utf8');

describe('S-2 INV-2: data-gap statement (docs/DATA_GAP.md)', () => {
  it('criterion 1: docs/DATA_GAP.md exists and is non-empty', () => {
    expect(existsSync(dataGapPath)).toBe(true);
    expect(read(dataGapPath).trim().length).toBeGreaterThan(0);
  });

  it('criterion 4: states the intended SAP extract and its two sheets', () => {
    const md = read(dataGapPath);
    expect(md).toContain('mock_inventory_input_data.xlsx');
    expect(md).toContain('Inventory_Input');
    expect(md).toContain('Monthly_Consumption');
  });

  it('criterion 4: enumerates the five structural data gaps', () => {
    const md = read(dataGapPath);
    // The gaps are a numbered list under the "Confirmed data gaps" section.
    const section = md.split('## 3.')[1]?.split('## 4.')[0] ?? '';
    const numbered = section.match(/^\d+\.\s+\*\*/gm) ?? [];
    expect(numbered.length).toBe(5);
    // The headline gap that every downstream ticket must honour.
    expect(section).toContain('No PR/PO history');
  });

  it('criterion: PR recommendations are declared advisory (consequence of gap 1)', () => {
    expect(read(dataGapPath).toLowerCase()).toContain('advisory');
  });

  it('criterion 4: says what the commander must supply to unblock the numbers', () => {
    const md = read(dataGapPath);
    const section = md.split('## 5.')[1] ?? '';
    expect(section).toContain('Attach the SAP extract');
    expect(section).toContain('Connect the forecasting MCP');
  });

  it('regression: header appears once, with a single verification date', () => {
    const md = read(dataGapPath);
    // A botched merge previously left two conflicting header lines
    // (verified 2026-09-23 AND 2026-09-22). The document must carry one.
    const headers = md.match(/^\*\*Ticket:\*\* S-2 \(INV-2\)/gm) ?? [];
    expect(headers.length).toBe(1);
    const dates = md.match(/inputs verified:\*\* \d{4}-\d{2}-\d{2}/g) ?? [];
    expect(dates.length).toBe(1);
  });

  it('regression: the availability table lists each input exactly once', () => {
    const md = read(dataGapPath);
    // The same merge left the "what is actually available" table duplicated
    // with contradictory evidence for the SAP extract row.
    const extractRows = md.match(/^\| SAP extract `mock_inventory_input_data\.xlsx`/gm) ?? [];
    expect(extractRows.length).toBe(1);
  });
});

describe('S-2 INV-2: data profile (docs/DATA_PROFILE.md)', () => {
  it('criterion 2: docs/DATA_PROFILE.md exists and is non-empty', () => {
    expect(existsSync(dataProfilePath)).toBe(true);
    expect(read(dataProfilePath).trim().length).toBeGreaterThan(0);
  });

  it('criterion 3: profiles the Inventory_Input schema with typed columns', () => {
    const md = read(dataProfilePath);
    expect(md).toContain('Inventory_Input');
    // Key typed columns the downstream KPI/forecast work depends on.
    for (const col of [
      'Material code',
      'Material type',
      'Current stock',
      'Reorder point',
      'Lead time (days)',
      'Unit cost',
    ]) {
      expect(md).toContain(col);
    }
    // ZSPR/ZSPN material-type enum is called out.
    expect(md).toContain('ZSPR');
    expect(md).toContain('ZSPN');
  });

  it('criterion 3: profiles the Monthly_Consumption 12-month window', () => {
    const md = read(dataProfilePath);
    expect(md).toContain('Monthly_Consumption');
    expect(md).toContain('2025-10');
    expect(md).toContain('2026-09');
    expect(md).toMatch(/12[ -]month|12 points/);
  });

  it('criterion 5: reconciles expected vs present for each input', () => {
    const md = read(dataProfilePath);
    const section = md.split('## Reconciliation')[1] ?? '';
    expect(section).toContain('Inventory_Input');
    expect(section).toContain('Monthly_Consumption');
    // Reconciliation records that the source file is not present this session.
    expect(section.toLowerCase()).toMatch(/un-observed|absent|not connected/);
  });
});
