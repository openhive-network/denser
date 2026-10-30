import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDynamicGlobalProperties, getManabar } from '@transaction/lib/hive-api';
import { CircleSpinner } from '@ui/components/circle-spinner';
import { formatRestoreTime } from './lib/utils';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { prepareRC } from '@/wallet/lib/utils';
import DelegateRCDialog from './delegate-rc-dialog';
import { delegatableRawRc } from './lib/rc-amount';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/wallet/i18n/client';

// recharts draws the manabar rings only once the manabars are fetched: keep it out of page-load chunks.
const RCStats = dynamic(() => import('./rc-stats'), { ssr: false });

const RCRow = ({
  username,
  suggestedUsers
}: {
  username: string;
  suggestedUsers: { username: string; about: string }[];
}) => {
  const { t } = useTranslation('common_wallet');
  const queryClient = useQueryClient();
  // Shares the page's global properties query instead of requesting them a second time.
  const loadDynamicGlobalProperties = () =>
    queryClient.fetchQuery({
      queryKey: ['dynamicGlobalPropertiesData'],
      queryFn: () => getDynamicGlobalProperties()
    });
  const { data, isPending } = useQuery({
    queryKey: ['manabar', username],
    queryFn: () => getManabar(username, loadDynamicGlobalProperties),
    select: (e) =>
      e
        ? {
            upvote: {
              current: prepareRC(e.upvote.current, t),
              max: prepareRC(e.upvote.max, t),
              percentageValue: e.upvote.percentageValue,
              cooldown: formatRestoreTime(e.upvote.cooldown, t)
            },
            downvote: {
              current: prepareRC(e.downvote.current, t),
              max: prepareRC(e.downvote.max, t),
              percentageValue: e.downvote.percentageValue,
              cooldown: formatRestoreTime(e.downvote.cooldown, t)
            },
            rc: {
              current: prepareRC(e.rc.current, t),
              max: prepareRC(e.rc.max, t),
              percentageValue: e.rc.percentageValue,
              cooldown: formatRestoreTime(e.rc.cooldown, t)
            },
            delegatableRC: delegatableRawRc({
              maxRc: e.rc.max,
              currentRc: e.rc.current,
              creationAdjustment: e.rcCreationAdjustment,
              receivedDelegated: e.rcReceivedDelegated
            }),
            rcCreationAdjustment: e.rcCreationAdjustment
          }
        : null
  });
  const { user } = useUserClient();

  return (
    <div className="flex w-full flex-col bg-background-secondary sm:table-row">
      <div className="flex gap-4 p-4">
        <div>
          <h2 className="font-semibold">{t('resource_credits.title')}</h2>
          <p className="text-xs leading-relaxed text-primary/70">{t('resource_credits.description')}</p>
        </div>
      </div>
      {isPending ? (
        <div className="flex h-full items-center justify-center">
          <CircleSpinner size={24} color="#dc2626" />
        </div>
      ) : !!data ? (
        <div className="my-2 flex flex-col items-center justify-around gap-2 sm:flex-row">
          <div className="text-green-600">
            <RCStats
              current={data.upvote.current}
              max={data.upvote.max}
              title={t('resource_credits.upvote')}
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
              title={t('resource_credits.rc')}
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
              title={t('resource_credits.downvote')}
              angle={(360 * data.downvote.percentageValue) / 100}
              color="#C01000"
              restoreTime={data.downvote.cooldown}
              percentageValue={data.downvote.percentageValue}
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p>{t('resource_credits.no_data')}</p>
        </div>
      )}
      {user.username === username && !!data ? (
        <div className="my-4 flex justify-center">
          <DelegateRCDialog
            fromAccount={username}
            delegatableRC={data.delegatableRC}
            creationAdjustmentRC={data.rcCreationAdjustment}
            suggestedUsers={suggestedUsers}
          />
        </div>
      ) : null}
    </div>
  );
};

export default RCRow;
