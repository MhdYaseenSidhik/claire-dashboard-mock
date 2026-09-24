import { useCallback, useEffect, useState } from 'react';
import { type AnalysisBundle, fetchAnalysis } from '../lib/analysis';

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: AnalysisBundle };

/**
 * Load the analysis bundle with explicit loading / error / ready states so the
 * dashboard can render a skeleton, an inline recoverable error, or the data —
 * never a blank screen or a spinner that never stops.
 */
export function useAnalysis(): LoadState & { reload: () => void } {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnalysis(undefined, ctrl.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState({ status: 'error', error: err instanceof Error ? err.message : 'Failed to load analysis.' });
      });
    return () => ctrl.abort();
  }, [nonce]);

  return { ...state, reload };
}
