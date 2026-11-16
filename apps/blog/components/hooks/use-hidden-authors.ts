import { useQuery } from '@tanstack/react-query';
import { hiddenAuthorsApi } from '@transaction/lib/bridge-api';
import { fetchHiddenAuthors } from '@transaction/lib/hidden-authors';
import { StaleTime } from '@/blog/lib/react-query';

/** The React Query key of `observer`'s hidden authors; a change to its mutes or blacklists invalidates it. */
export const hiddenAuthorsQueryKey = (observer: string) => ['hiddenAuthors', observer];

/**
 * The authors whose posts `observer` does not read, for feeds that take no observer.
 * `initialAuthors`, read by the server for `observer`, answers it until it is stale.
 */
export const useHiddenAuthors = (observer: string, enabled: boolean, initialAuthors: string[] | null = null) =>
  useQuery({
    queryKey: hiddenAuthorsQueryKey(observer),
    queryFn: () => fetchHiddenAuthors(observer, hiddenAuthorsApi),
    enabled,
    initialData: initialAuthors ? () => new Set(initialAuthors) : undefined,
    staleTime: StaleTime.MEDIUM
  });
