export interface BackPaginationState {
  loading: boolean;
  /** False once the start of the room's history was reached */
  hasMore: boolean;
  /** The last attempt failed; the next `load` tries again */
  failed: boolean;
}

export const INITIAL_BACK_PAGINATION: BackPaginationState = { loading: false, hasMore: true, failed: false };

export interface BackPaginator {
  state(): BackPaginationState;
  /** Loads the previous page, unless one is loading or there is none */
  load(): Promise<void>;
}

/**
 * Pages a room's history backwards through `paginate`, which resolves to whether more is
 * left, one page at a time, reporting each change of state to `onChange`.
 */
export function createBackPaginator(
  paginate: () => Promise<boolean>,
  onChange: (state: BackPaginationState) => void
): BackPaginator {
  let current = INITIAL_BACK_PAGINATION;
  const update = (next: BackPaginationState) => {
    current = next;
    onChange(next);
  };
  return {
    state: () => current,
    async load() {
      if (current.loading || !current.hasMore) return;
      update({ ...current, loading: true, failed: false });
      try {
        const hasMore = await paginate();
        update({ loading: false, hasMore, failed: false });
      } catch {
        update({ ...current, loading: false, failed: true });
      }
    }
  };
}
