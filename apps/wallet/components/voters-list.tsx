import Big from 'big.js';
import { useProposalsVotersQuery } from './hooks/use-proposals-voters';
import { useAccountQuery } from './hooks/use-accounts-voters';
import VotersItem from './voters-item';
import Loading from '@ui/components/loading';
import { KeyboardEvent, useState } from 'react';
import { useTranslation } from '@/wallet/i18n/client';

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

function VotersList({
  id,
  totalShares,
  totalVestingFund
}: {
  id: number;
  totalShares: Big;
  totalVestingFund: Big;
}) {
  const { t } = useTranslation('common_wallet');
  // Roving tabindex: a proposal can have over a thousand voters, so only one voter link is in the
  // Tab order and the arrow keys, Home and End move between them.
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: votersData, isPending: votersIsLoading } = useProposalsVotersQuery(id);
  const usernames = votersData ? votersData.map((e) => e.voter) : [];
  const { data: accData, isPending: accIsLoading } = useAccountQuery(
    usernames,
    totalVestingFund,
    totalShares
  );
  const sortedData =
    accData && !accIsLoading
      ? accData.sort((a, b) => {
          const proxyA = a.proxy ? parseFloat(a.proxy) : 0;
          const proxyB = b.proxy ? parseFloat(b.proxy) : 0;
          const totalA = proxyA + a.hp;
          const totalB = proxyB + b.hp;
          return totalB - totalA;
        })
      : null;
  if (votersIsLoading || accIsLoading) {
    return (
      <div className="absolute place-self-center">
        <Loading loading={votersIsLoading || accIsLoading} />
      </div>
    );
  }
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('a'));
    const nextIndex = getNextVoterIndex(event.key, activeIndex, links.length);
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveIndex(nextIndex);
    links[nextIndex]?.focus();
  };
  return (
    <ul
      className="grid justify-center gap-y-6 text-center text-sm sm:grid-cols-2"
      aria-label={t('proposals_page.voters_list')}
      onKeyDown={onKeyDown}
    >
      {sortedData?.map((e, index) => (
        <VotersItem
          key={e.name}
          username={e.name}
          hp={e.hp}
          proxy={e.proxy ? parseFloat(e.proxy) : 0}
          tabIndex={index === activeIndex ? 0 : -1}
          onFocus={() => setActiveIndex(index)}
        />
      ))}
    </ul>
  );
}
export default VotersList;
