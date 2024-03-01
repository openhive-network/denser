import Big from 'big.js';
import { useProposalsVotersQuery } from './hooks/use-proposals-voters';
import { useAccountQuery } from './hooks/use-accouts-voters';
import VotersItem from './voters-item';
import Loading from '@ui/components/loading';

function VotersList({
  id,
  totalShares,
  totalVestingFund
}: {
  id: number;
  totalShares: Big;
  totalVestingFund: Big;
}) {
  const { data: votersData, isLoading: votersIsLoading } = useProposalsVotersQuery(id);
  const usernames = votersData ? votersData.map((e) => e.voter) : [];
  const { data: accData, isLoading: accIsLoading } = useAccountQuery(
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
  return (
    <div className="grid justify-center gap-y-6 text-center text-sm sm:grid-cols-2">
      {sortedData?.map((e) => (
        <VotersItem key={e.name} username={e.name} hp={e.hp} proxy={e.proxy ? parseFloat(e.proxy) : 0} />
      ))}
    </div>
  );
}
export default VotersList;
