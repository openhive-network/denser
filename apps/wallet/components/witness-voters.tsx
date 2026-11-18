import { useState } from 'react';
import { useWitnessVoters } from './hooks/use-witness-voters';
import type { VestingTotals } from '@/wallet/lib/voters';
import VotersPanel from './voters-panel';

interface WitnessVotersProps {
  witness: string;
  /** The witness's vote total in HP, which each voter's share is of. */
  totalHp: number;
  totals: VestingTotals;
}

/** The voters of `witness`, by weight from hafbe-api, else by name only (see `useWitnessVoters`). */
function WitnessVoters({ witness, totalHp, totals }: WitnessVotersProps) {
  const [query, setQuery] = useState('');
  const { pages, voters, weighted, voterCount, searchMatches } = useWitnessVoters(witness, totals, query);
  return (
    <VotersPanel
      voters={voters}
      voterCount={voterCount}
      totalHp={weighted ? totalHp : null}
      status={pages.status}
      hasMore={pages.hasNextPage}
      loadingMore={pages.isFetchingNextPage}
      onLoadMore={() => void pages.fetchNextPage()}
      query={query}
      onQueryChange={setQuery}
      searchMatches={searchMatches}
    />
  );
}

export default WitnessVoters;
