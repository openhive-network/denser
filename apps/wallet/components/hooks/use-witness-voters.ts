import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getLogger } from '@ui/lib/logging';
import { getHafbeWitnessVoters, getWitnessVoterNames } from '@/wallet/lib/hive';
import {
  FIRST_WITNESS_VOTERS_PAGE,
  asAccountName,
  fetchWitnessVotersPage,
  findWitnessVoter,
  vestsToHp,
  type VestingTotals,
  type WitnessVotersReads
} from '@/wallet/lib/voters';

const logger = getLogger('app');

const SEARCH_DEBOUNCE_MS = 300;

const witnessVotersReads = (totals: VestingTotals): WitnessVotersReads => ({
  hafbeVoters: getHafbeWitnessVoters,
  voterNamesFrom: getWitnessVoterNames,
  vestsToHp: (vests) => vestsToHp(vests, totals),
  onHafbeUnavailable: (error) =>
    logger.warn('Witness voters: no node serves hafbe-api, listing the voters by name only: %o', error)
});

const useDebouncedValue = (value: string, delayMs: number): string => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
};

/**
 * The voters of `witness`, page by page (see `fetchWitnessVotersPage`), weighted in HP at `totals`,
 * and, while the list has weights, hafbe-api's voter named `query` exactly, which the pages loaded
 * so far may not hold yet.
 */
export const useWitnessVoters = (witness: string, totals: VestingTotals, query: string) => {
  const reads = useMemo(() => witnessVotersReads(totals), [totals]);
  const pages = useInfiniteQuery({
    queryKey: ['witnessVoters', witness],
    queryFn: ({ pageParam }) => fetchWitnessVotersPage(reads, witness, pageParam),
    initialPageParam: FIRST_WITNESS_VOTERS_PAGE,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined
  });
  const firstPage = pages.data?.pages[0];
  const searchedName = asAccountName(useDebouncedValue(query, SEARCH_DEBOUNCE_MS));
  const searched = useQuery({
    queryKey: ['witnessVoter', witness, searchedName],
    queryFn: () => findWitnessVoter(reads, witness, searchedName ?? ''),
    enabled: !!searchedName && !!firstPage?.weighted
  });
  return {
    pages,
    voters: useMemo(() => pages.data?.pages.flatMap((page) => page.voters) ?? [], [pages.data]),
    weighted: firstPage?.weighted ?? true,
    voterCount: firstPage?.voterCount ?? null,
    searchMatches: searchedName ? (searched.data ?? []) : []
  };
};
