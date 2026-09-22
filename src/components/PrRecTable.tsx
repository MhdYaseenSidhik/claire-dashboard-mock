import { useMemo, useState } from 'react';
import { ClipboardList, Info } from 'lucide-react';
import type { Recommendation } from '../lib/analysis';
import { formatDate, formatNum } from '../lib/format';
import { Panel } from './ui/Card';
import { Badge, Chip } from './ui/Badge';
import { SegmentedControl } from './ui/SegmentedControl';
import { EmptyState, Skeleton } from './ui/State';

type Scope = 'raise' | 'all';

const SCOPE_OPTS = [
  { value: 'raise' as const, label: 'To raise' },
  { value: 'all' as const, label: 'All' },
];

function HeaderCell({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={`sticky top-0 z-10 bg-surface-2 px-4 py-2 text-caption font-semibold text-muted ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {children}
    </th>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <td className="nums px-4 py-3 text-right text-body text-fg">{children}</td>;
}

export function PrRecTable({ recommendations }: { recommendations: Recommendation[] }) {
  const [scope, setScope] = useState<Scope>('raise');
  const rows = useMemo(
    () =>
      recommendations
        .filter((r) => (scope === 'raise' ? r.recommend : true))
        .sort((a, b) => Number(b.recommend) - Number(a.recommend) || a.raiseByDate.localeCompare(b.raiseByDate)),
    [recommendations, scope],
  );

  const toRaise = recommendations.filter((r) => r.recommend).length;

  return (
    <Panel
      title="Purchase-requisition recommendations"
      caption={
        <span className="inline-flex items-center gap-1">
          <Info size={12} className="text-muted" />
          Advisory — the SAP extract carries no PR/PO history; timing is derived from stock + forecast demand over
          lead time vs ROP / safety stock.
        </span>
      }
      actions={<SegmentedControl options={SCOPE_OPTS} value={scope} onChange={setScope} ariaLabel="Recommendation scope" />}
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={22} />}
          title={scope === 'raise' ? 'No purchase requisitions recommended this cycle' : 'No materials to show'}
          hint={scope === 'raise' ? 'Every material holds cover over its lead time. Switch to “All” to see the full assessment.' : undefined}
          tone={scope === 'raise' ? 'success' : 'muted'}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-body">
            <caption className="sr-only">
              Purchase-requisition recommendations with lead-time-aware raise-by dates. {toRaise} to raise.
            </caption>
            <thead>
              <tr>
                <HeaderCell>Material</HeaderCell>
                <HeaderCell>Plant</HeaderCell>
                <HeaderCell>Category</HeaderCell>
                <HeaderCell align="right">Stock</HeaderCell>
                <HeaderCell align="right">Fcst / lead</HeaderCell>
                <HeaderCell align="right">ROP / SS</HeaderCell>
                <HeaderCell align="right">Raise qty</HeaderCell>
                <HeaderCell>Raise by</HeaderCell>
                <HeaderCell align="right">Lead (d)</HeaderCell>
                <HeaderCell>Reason</HeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {rows.map((r) => (
                <tr key={`${r.materialCode}-${r.plant}`} className="transition-colors duration-fast hover:bg-surface-2/60">
                  <td className="nums px-4 py-3 text-body font-medium text-fg">{r.materialCode}</td>
                  <td className="px-4 py-3"><Chip>{r.plant}</Chip></td>
                  <td className="px-4 py-3 text-caption text-muted">{r.category}</td>
                  <Num>{formatNum(r.currentStock)}</Num>
                  <Num>{formatNum(r.forecastOverLeadTime, 1)}</Num>
                  <Num>{formatNum(r.reorderPoint)} / {formatNum(r.safetyStock)}</Num>
                  <td className="nums px-4 py-3 text-right">
                    {r.recommend ? (
                      <span className="font-semibold text-fg">{formatNum(r.qty)}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="nums px-4 py-3 text-body text-fg">
                    {r.recommend ? formatDate(r.raiseByDate) : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.longLead ? (
                      <Badge tone="warning">{formatNum(r.leadTimeDays)}</Badge>
                    ) : (
                      <span className="nums text-body text-muted">{formatNum(r.leadTimeDays)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-caption text-muted">
                    <span className="flex items-center gap-2">
                      {r.recommend ? <Badge tone="accent">Raise</Badge> : null}
                      {r.reason}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export function PrRecTableSkeleton() {
  return (
    <Panel title="Purchase-requisition recommendations" caption="Loading recommendations…">
      <div className="p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-9 w-full" />
        ))}
      </div>
    </Panel>
  );
}
