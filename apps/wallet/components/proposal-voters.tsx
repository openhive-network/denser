import { useMemo, useState } from 'react';
import { useProposalVotersQuery } from './hooks/use-proposal-voters';
import { totalHpOf, type VestingTotals } from '@/wallet/lib/voters';
import VotersPanel from './voters-panel';

// Every voter is loaded at once: there is nothing more to load.
const NOTHING_TO_LOAD = () => undefined;

/**
 * The voters of proposal `id`, weighted at `totals`. The node lists a proposal's votes without
 * weights, so all of them are loaded and ranked at once; the rows still show a page at a time.
 */
function ProposalVoters({ id, totals }: { id: number; totals: VestingTotals }) {
  const [query, setQuery] = useState('');
  const { data, status } = useProposalVotersQuery(id, totals);
  const voters = useMemo(() => data ?? [], [data]);
  return (
    <VotersPanel
      voters={voters}
      voterCount={voters.length}
      totalHp={totalHpOf(voters)}
      status={status}
      hasMore={false}
      loadingMore={false}
      onLoadMore={NOTHING_TO_LOAD}
      query={query}
      onQueryChange={setQuery}
    />
  );
}

export default ProposalVoters;
