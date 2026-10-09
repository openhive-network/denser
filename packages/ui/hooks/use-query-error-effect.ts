import { useEffect, useRef } from 'react';

interface QueryErrorState<TError> {
  error: TError | null;
  errorUpdatedAt: number;
}

/**
 * Calls `onError` once for each fetch of the query that fails after the hook mounts, as the
 * per-query `onError` option removed in React Query v5 did. An error the query already held at
 * mount is not reported. Pass the query result; `onError` may change between renders.
 */
export function useQueryErrorEffect<TError>(
  { error, errorUpdatedAt }: QueryErrorState<TError>,
  onError: (error: TError) => void
): void {
  const onErrorRef = useRef(onError);
  const errorAtMount = useRef(errorUpdatedAt);

  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (error && errorUpdatedAt !== errorAtMount.current) onErrorRef.current(error);
  }, [error, errorUpdatedAt]);
}
