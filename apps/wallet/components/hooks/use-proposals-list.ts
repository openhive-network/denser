import { useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Big from 'big.js';
import { IGetProposalsParams, IProposal } from '@hive/common-hiveio-packages/wax';
import { DEFAULT_PARAMS_FOR_PROPOSALS, getProposals, type ProposalData } from '@/wallet/lib/hive';
import { fetchProposalPagesFrom, matchesProposalSearch, uniqueProposals } from '@/wallet/lib/proposals-list';

// database_api's single-query limit (DATABASE_API_SINGLE_QUERY_LIMIT); more than every proposal there is.
const REST_OF_LIST_PAGE_LIMIT = 1000;

export type ProposalsListParams = Pick<IGetProposalsParams, 'status' | 'order' | 'order_direction'>;

/**
 * How much of the listing a search covers: all of it, not yet (the rest is loading), or only the
 * loaded pages because the rest failed to load.
 */
export type ProposalsSearchCoverage = 'complete' | 'loading' | 'incomplete';

const toProposalData = (proposal: IProposal): ProposalData => ({
  ...proposal,
  total_votes: new Big(parseFloat(proposal.total_votes).toFixed(2)),
  daily_pay: {
    amount: new Big(proposal.daily_pay.amount).div(1000)
  }
});

const toProposalDataPages = (pages: IProposal[][]): ProposalData[][] =>
  pages.map((page) => page.map(toProposalData));

const searchCoverage = (
  searching: boolean,
  hasNextPage: boolean,
  rest: { isSuccess: boolean; isError: boolean }
): ProposalsSearchCoverage => {
  if (!searching || !hasNextPage || rest.isSuccess) return 'complete';
  return rest.isError ? 'incomplete' : 'loading';
};

/**
 * A proposals listing as the page shows it: page by page (`fetchNextPage`) without a search; with
 * one, its whole rest in as few calls as it takes, once per listing, filtered by `search`.
 * `proposals` keeps the listing's order; `loadedProposals` is what the pages alone hold.
 */
export const useProposalsList = (params: ProposalsListParams, search: string) => {
  const { status, order, order_direction } = params;
  const searching = search.trim() !== '';
  const pagesQuery = useInfiniteQuery({
    queryKey: ['proposals', status, order, order_direction],
    queryFn: ({ pageParam: last_id }: { pageParam: number | undefined }) =>
      getProposals({ last_id, status, order, order_direction }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.length >= DEFAULT_PARAMS_FOR_PROPOSALS.limit
        ? lastPage[lastPage.length - 1].id
        : undefined;
    },
    select: (proposals) => ({ ...proposals, pages: toProposalDataPages(proposals.pages) })
  });
  const loadedPages = pagesQuery.data?.pages;
  const lastLoadedId = loadedPages?.at(-1)?.at(-1)?.id;
  const restQuery = useQuery({
    queryKey: ['proposals', status, order, order_direction, 'rest'],
    queryFn: () =>
      fetchProposalPagesFrom(
        (last_id) =>
          getProposals({ last_id, status, order, order_direction, limit: REST_OF_LIST_PAGE_LIMIT }),
        lastLoadedId,
        REST_OF_LIST_PAGE_LIMIT
      ),
    enabled: searching && pagesQuery.hasNextPage,
    select: toProposalDataPages
  });
  const restPages = searching ? restQuery.data : undefined;

  const loadedProposals = useMemo(() => uniqueProposals(loadedPages ?? []), [loadedPages]);
  const proposals = useMemo(
    () =>
      uniqueProposals([...(loadedPages ?? []), ...(restPages ?? [])]).filter((proposal) =>
        matchesProposalSearch(proposal, search)
      ),
    [loadedPages, restPages, search]
  );
  const coverage = searchCoverage(searching, pagesQuery.hasNextPage, restQuery);

  return {
    pagesQuery,
    loadedProposals,
    proposals,
    coverage,
    /** Whether scrolling to the end should load the next page: the rest has not replaced paging. */
    loadsOnScroll: !searching || coverage === 'incomplete'
  };
};
