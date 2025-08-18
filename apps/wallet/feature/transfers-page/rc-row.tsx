import { useQuery } from '@tanstack/react-query';
import { getManabar } from '@transaction/lib/hive';
import { CircleSpinner } from 'react-spinners-kit';
import { hoursAndMinutes } from './lib/utils';
import RCStats from './rc-stats';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Button } from '@ui/components';
import { prepareRC } from '@/wallet/lib/utils';
import { useDelegateRCMutation } from './hooks/use-delegate-mutation';
import DelegateRCDialog from './delegate-rc-dialog';

const RCRow = ({ username }: { username: string }) => {
  const { data, isLoading } = useQuery(['manabar', username], () => getManabar(username), {
    select: (e) =>
      e
        ? {
            upvote: {
              current: prepareRC(e.upvote.current),
              max: prepareRC(e.upvote.max),
              percentageValue: e.upvote.percentageValue,
              cooldown: hoursAndMinutes(e.upvote.cooldown)
            },
            downvote: {
              current: prepareRC(e.downvote.current),
              max: prepareRC(e.downvote.max),
              percentageValue: e.downvote.percentageValue,
              cooldown: hoursAndMinutes(e.downvote.cooldown)
            },
            rc: {
              current: prepareRC(e.rc.current),
              max: prepareRC(e.rc.max),
              percentageValue: e.rc.percentageValue,
              cooldown: hoursAndMinutes(e.rc.cooldown)
            }
          }
        : null
  });
  const { user } = useUser();

  return (
    <div className="flex w-full flex-col bg-background-secondary sm:table-row">
      <div className="flex gap-4 p-4">
        <div>
          <h2 className="font-semibold">Resource Credits</h2>
          <p className="text-xs leading-relaxed text-primary/70">
            Content votes, and curation rewards are calculated as if it were their own Hive Power. Users are
            not able to power down or cash out delegated Hive Power however, as it still belongs to the
            original owner.
          </p>
        </div>
      </div>
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <CircleSpinner size={24} color="#dc2626" />
        </div>
      ) : !!data ? (
        <div className="my-2 flex flex-col items-center justify-around gap-2 sm:flex-row">
          <div className="text-green-600">
            <RCStats
              current={data.upvote.current}
              max={data.upvote.max}
              title="Upvote"
              angle={(360 * data.upvote.percentageValue) / 100}
              color="#00C040"
              restoreTime={data.upvote.cooldown}
              percentageValue={data.upvote.percentageValue}
            />
          </div>

          <div>
            <RCStats
              current={data.rc.current}
              max={data.rc.max}
              title="RC"
              angle={(360 * data.rc.percentageValue) / 100}
              color="#0088FE"
              restoreTime={data.rc.cooldown}
              percentageValue={data.rc.percentageValue}
            />
          </div>
          <div className="text-destructive">
            <RCStats
              current={data.downvote.current}
              max={data.downvote.max}
              title="Downvote"
              angle={(360 * data.downvote.percentageValue) / 100}
              color="#C01000"
              restoreTime={data.downvote.cooldown}
              percentageValue={data.downvote.percentageValue}
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p>No data available</p>
        </div>
      )}
      {user.username === username ? (
        <div className="my-4 flex justify-center">
          <DelegateRCDialog />
        </div>
      ) : null}
    </div>
  );
};

export default RCRow;
