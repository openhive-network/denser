import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import Big from 'big.js';
import { Input } from '@ui/components/input';
import Loading from '@ui/components/loading';
import { getRoundedAbbreveration } from '@hive/ui/lib/utils';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useTranslation } from '@/wallet/i18n/client';
import { VOTERS_PAGE_SIZE, breakdownOf, filterByName, type Voter } from '@/wallet/lib/voters';
import VotersBreakdownBar from './voters-breakdown-bar';
import VoterRow from './voter-row';

/** Index the focus moves to from `index` on `key` among `count` items, or null for other keys. */
function getNextVoterIndex(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return Math.min(index + 1, count - 1);
    case 'ArrowUp':
    case 'ArrowLeft':
      return Math.max(index - 1, 0);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** `matches` found by the source, then the loaded voters matching `query`, each voter once. */
const searchResults = (voters: readonly Voter[], query: string, matches: readonly Voter[]): Voter[] => {
  const filtered = filterByName(voters, query);
  const listed = new Set(filtered.map((voter) => voter.name));
  return [...matches.filter((voter) => !listed.has(voter.name)), ...filtered];
};

export interface VotersPanelProps {
  /** The voters loaded so far, largest first (or in name order when they carry no weights). */
  voters: Voter[];
  /** All the voters, when the source tells. */
  voterCount: number | null;
  /** The weight the shares are of; null when the voters carry no weights. */
  totalHp: number | null;
  status: 'pending' | 'error' | 'success';
  /** Whether the source holds voters not loaded yet. */
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  /** Voters the source found for `query` beyond the loaded ones. */
  searchMatches?: Voter[];
}

/**
 * The body of the voters dialog: the count and total, the breakdown bar, the search and the rows,
 * VOTERS_PAGE_SIZE more each time the reader scrolls to the end, loading more from the source once
 * every loaded voter is shown.
 */
function VotersPanel({
  voters,
  voterCount,
  totalHp,
  status,
  hasMore,
  loadingMore,
  onLoadMore,
  query,
  onQueryChange,
  searchMatches = []
}: VotersPanelProps) {
  const { t } = useTranslation('common_wallet');
  const { user } = useUserClient();
  const [shownCount, setShownCount] = useState(VOTERS_PAGE_SIZE);
  // Roving tabindex: only one voter link is in the Tab order; the arrow keys, Home and End move between them.
  const [activeIndex, setActiveIndex] = useState(0);
  const listed = useMemo(
    () => (query.trim() ? searchResults(voters, query, searchMatches) : voters),
    [voters, query, searchMatches]
  );
  const shown = listed.slice(0, shownCount);
  const canLoadMore = shownCount < listed.length || (hasMore && !query.trim());
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLButtonElement>(null);

  const showMore = () => {
    if (shownCount >= listed.length && hasMore && !loadingMore) onLoadMore();
    setShownCount((count) => count + VOTERS_PAGE_SIZE);
  };
  const showMoreRef = useRef(showMore);
  useEffect(() => {
    showMoreRef.current = showMore;
  });

  // A new observer reports whether the button is in view at once, so a list still too short to
  // scroll keeps loading after each page.
  useEffect(() => {
    const button = loadMoreRef.current;
    if (!button || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) showMoreRef.current();
      },
      { root: scrollRef.current }
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, [shown.length, loadingMore, canLoadMore]);

  const onSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onQueryChange(event.target.value);
    setShownCount(VOTERS_PAGE_SIZE);
    setActiveIndex(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('a'));
    const nextIndex = getNextVoterIndex(event.key, activeIndex, links.length);
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveIndex(nextIndex);
    links[nextIndex]?.focus();
  };

  if (status === 'pending') return <Loading loading />;
  if (status === 'error') {
    return <p className="p-4 text-center text-sm">{t('global.something_went_wrong')}</p>;
  }

  const count = voterCount ?? voters.length;
  const weighted = totalHp !== null;
  const summary = weighted
    ? t('voters_dialog.summary', { count, total: getRoundedAbbreveration(Big(totalHp)) })
    : hasMore
      ? t('voters_dialog.count_more', { count })
      : t('voters_dialog.count', { count });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-300" data-testid="voters-summary">
        {summary}
      </p>
      {weighted && totalHp > 0 && voters.length > 0 && (
        <VotersBreakdownBar breakdown={breakdownOf(voters, totalHp, count)} />
      )}
      {!weighted && (
        <p
          className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900 dark:bg-amber-900/60 dark:text-amber-100"
          data-testid="voters-weights-unavailable"
        >
          {t('voters_dialog.weights_unavailable')}
        </p>
      )}
      <Input
        type="search"
        value={query}
        onChange={onSearch}
        placeholder={t('voters_dialog.search_placeholder')}
        aria-label={t('voters_dialog.search_label')}
        className="h-9 w-full sm:max-w-xs"
        data-testid="voters-search"
      />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 ? (
          <p className="p-4 text-center text-sm text-slate-600 dark:text-slate-300" data-testid="voters-empty">
            {query.trim() ? t('voters_dialog.no_matches') : t('voters_dialog.no_voters')}
          </p>
        ) : (
          <ul
            className="grid grid-cols-1 gap-x-4 md:grid-cols-2 lg:grid-cols-3"
            aria-label={t('proposals_page.voters_list')}
            onKeyDown={onKeyDown}
            data-testid="voters-list"
          >
            {shown.map((voter, index) => (
              <VoterRow
                key={voter.name}
                voter={voter}
                totalHp={totalHp}
                isOwn={!!user?.isLoggedIn && user.username === voter.name}
                tabIndex={index === activeIndex ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
              />
            ))}
          </ul>
        )}
        {canLoadMore && (
          <button
            ref={loadMoreRef}
            type="button"
            onClick={showMore}
            disabled={loadingMore}
            className="mx-auto my-3 block rounded-md px-3 py-1 text-sm text-red-500 hover:underline disabled:opacity-60"
            data-testid="voters-load-more"
          >
            {loadingMore ? t('global.loading') : t('voters_dialog.load_more')}
          </button>
        )}
      </div>
    </div>
  );
}

export default VotersPanel;
