import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../utils/format';

type RequestState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Runs a service call on mount and tracks its loading and error state.
// Pass a stable function (a module-level service such as getDashboard), not an
// inline arrow, or it will refetch on every render.
export function useApiRequest<T>(request: () => Promise<T>) {
  const [state, setState] = useState<RequestState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    request().then(
      (data) => {
        if (!cancelled) setState({ status: 'success', data });
      },
      (err: unknown) => {
        if (!cancelled) setState({ status: 'error', error: errorMessage(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [request, attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return {
    data: state.status === 'success' ? state.data : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    reload,
  };
}
