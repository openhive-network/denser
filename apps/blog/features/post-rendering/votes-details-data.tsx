import { prepareVotes } from '@ui/lib/utils';
import { Entry, IVote } from '@hive/common-hiveio-packages/wax';
import { useMemo } from 'react';
import {
  getSidechainRewardsConfig,
  isSidechainRewardsConfigured
} from '@ui/lib/sidechain-rewards';
import BasePathLink from '../../components/base-path-link';
import { useActiveVotesQuery } from '../../components/hooks/use-active-votes';
import { useTranslation } from '@/blog/i18n/client';
import { useSidechainCuratorRewards } from './hooks/use-sidechain-curator-rewards';
import { useSidechainPostReward } from '../list-of-posts/hooks/use-sidechain-post-reward';

const trimDecimals = (value: number, precision: number): string => {
  const boundedPrecision = Math.min(Math.max(precision, 0), 8);
  const fixed = value.toFixed(boundedPrecision);
  return fixed.replace(/\.?0+$/, '') || '0';
};

const formatHiveReward = (vote: IVote): string => {
  if (!vote.reward) {
    return '';
  }

  return Math.abs(parseFloat(vote.reward.toString())) < 0.0001
    ? ': $0'
    : `: $${Number(vote.reward).toFixed(2)}`;
};

const VotersDetailsData = ({ post }: { post: Entry }) => {
  const { t } = useTranslation('common_blog');
  const { data } = useActiveVotesQuery(post.author, post.permlink);
  const sidechainConfig = getSidechainRewardsConfig();
  const sidechainEnabled = isSidechainRewardsConfigured(sidechainConfig);
  const { data: sidechainCuratorRewards } = useSidechainCuratorRewards(post.author, post.permlink);
  const { data: sidechainAuthorReward } = useSidechainPostReward(post.author, post.permlink);

  const votes = data && prepareVotes(post, data);
  const hiveTopVoters = useMemo(() => {
    if (!votes) {
      return [];
    }

    return [...votes]
      .sort((a, b) => {
        const rewardA = Math.abs(Number(a.reward ?? 0));
        const rewardB = Math.abs(Number(b.reward ?? 0));
        if (rewardA !== rewardB) {
          return rewardB - rewardA;
        }

        const keyA = Math.abs(a.rshares);
        const keyB = Math.abs(b.rshares);
        if (keyA > keyB) return -1;
        if (keyA < keyB) return 1;
        return 0;
      })
      .slice(0, 20);
  }, [votes]);

  const sidechainTopCurators = useMemo(() => {
    if (!sidechainEnabled || !sidechainCuratorRewards) {
      return [];
    }

    return [...sidechainCuratorRewards].sort((a, b) => b.amount - a.amount).slice(0, 20);
  }, [sidechainEnabled, sidechainCuratorRewards]);

  const rowCount = sidechainEnabled
    ? Math.max(hiveTopVoters.length, sidechainTopCurators.length)
    : hiveTopVoters.length;
  const rowIndexes = useMemo(() => Array.from({ length: rowCount }, (_, index) => index), [rowCount]);
  const hiveMoreCount = Math.max((votes?.length ?? 0) - 20, 0);
  const sidechainMoreCount = Math.max((sidechainCuratorRewards?.length ?? 0) - 20, 0);
  const sidechainCuratorTotal = useMemo(
    () => (sidechainCuratorRewards ?? []).reduce((sum, reward) => sum + reward.amount, 0),
    [sidechainCuratorRewards]
  );
  const authorTokenPrecision = sidechainAuthorReward?.precision ?? 0;
  const authorTokenSymbol = sidechainAuthorReward?.token ?? sidechainConfig.token;
  const authorTokenAmount = sidechainAuthorReward?.amount ?? 0;

  return (
    <ul data-testid="list-of-voters" className={sidechainEnabled ? 'min-w-[24rem]' : undefined}>
      {sidechainEnabled ? (
        <>
          <li className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            <span>Hive</span>
            <span style={sidechainConfig.textColor ? { color: sidechainConfig.textColor } : undefined}>
              {sidechainConfig.token} Curator
            </span>
          </li>
          <li className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 pb-1 text-xs font-semibold text-gray-400">
            <span />
            <span style={sidechainConfig.textColor ? { color: sidechainConfig.textColor } : undefined}>
              Author: {trimDecimals(authorTokenAmount, authorTokenPrecision)} {authorTokenSymbol}
            </span>
          </li>
          <li className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 pb-1 text-xs font-semibold text-gray-400">
            <span />
            <span style={sidechainConfig.textColor ? { color: sidechainConfig.textColor } : undefined}>
              Curators: {trimDecimals(sidechainCuratorTotal, authorTokenPrecision)} {authorTokenSymbol}
            </span>
          </li>
        </>
      ) : null}
      {sidechainEnabled
        ? rowIndexes.map((index) => {
            const hiveVote = hiveTopVoters[index];
            const sidechainVote = sidechainTopCurators[index];

            return (
              <li key={`row-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                {hiveVote ? (
                  <BasePathLink
                    href={`/@${hiveVote.voter}`}
                    className="hover:cursor-pointer hover:text-destructive"
                  >
                    {hiveVote.voter}
                    {formatHiveReward(hiveVote)}
                    {hiveVote.rshares < 0 ? '[-]' : ''}
                  </BasePathLink>
                ) : (
                  <span />
                )}
                {sidechainVote ? (
                  <BasePathLink
                    href={`/@${sidechainVote.voter}`}
                    className="truncate font-semibold"
                    style={sidechainConfig.textColor ? { color: sidechainConfig.textColor } : undefined}
                  >
                    {sidechainVote.voter}: {trimDecimals(sidechainVote.amount, sidechainVote.precision)}{' '}
                    {sidechainVote.token}
                  </BasePathLink>
                ) : (
                  <span />
                )}
              </li>
            );
          })
        : hiveTopVoters.map((vote: IVote, index: number) => (
            <li key={`${vote.voter}-${index}`}>
              <BasePathLink href={`/@${vote.voter}`} className="hover:cursor-pointer hover:text-destructive">
                {vote.voter}
                {formatHiveReward(vote)}
                {vote.rshares < 0 ? '[-]' : ''}
              </BasePathLink>
            </li>
          ))}
      {sidechainEnabled && (hiveMoreCount > 0 || sidechainMoreCount > 0) ? (
        <li className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 pt-1.5 text-sm text-gray-500">
          <span>{hiveMoreCount > 0 ? t('post_content.footer.and_more', { value: hiveMoreCount }) : ''}</span>
          <span style={sidechainConfig.textColor ? { color: sidechainConfig.textColor } : undefined}>
            {sidechainMoreCount > 0 ? t('post_content.footer.and_more', { value: sidechainMoreCount }) : ''}
          </span>
        </li>
      ) : null}
      {!sidechainEnabled && hiveMoreCount > 0 ? (
        <li className="pt-1.5 text-sm text-gray-500">{t('post_content.footer.and_more', { value: hiveMoreCount })}</li>
      ) : null}
    </ul>
  );
};
export default VotersDetailsData;
