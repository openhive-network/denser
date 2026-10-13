import { prepareVotes } from '@ui/lib/utils';
import { Entry, IVote } from '@hive/common-hiveio-packages/wax';
import BasePathLink from '../../components/base-path-link';
import { useActiveVotesQuery } from '../../components/hooks/use-active-votes';
import { useTranslation } from '@/blog/i18n/client';
import { keepVotesBeforePayout } from './lib/votes-before-payout';
import { countVotesAfterPayout } from './lib/votes-after-payout';

const VotersDetailsData = ({ post }: { post: Entry }) => {
  const { t } = useTranslation('common_blog');
  const { data } = useActiveVotesQuery(post.author, post.permlink);

  const votes = data && prepareVotes(post, keepVotesBeforePayout(data, post.payout_at));
  const votesAfterPayout = data && post.stats ? countVotesAfterPayout(data, post.stats.total_votes) : 0;

  const sliced =
    votes &&
    votes
      .sort((a, b) => {
        const keyA = Math.abs(a.rshares);
        const keyB = Math.abs(b.rshares);
        if (keyA > keyB) return -1;
        if (keyA < keyB) return 1;
        return 0;
      })
      .slice(0, 20);

  return (
    <ul data-testid="list-of-voters">
      {sliced &&
        sliced.map((vote: IVote, index: number) => (
          <li key={index}>
            <BasePathLink href={`/@${vote.voter}`} className="hover:cursor-pointer hover:text-red-600">
              {vote.voter}
              {vote.reward
                ? Math.abs(parseFloat(vote.reward.toString())) < 0.0001
                  ? `: $0`
                  : `: $${Number(vote.reward).toFixed(2)}`
                : null}
              {vote.rshares < 0 ? '[-]' : ''}
            </BasePathLink>
          </li>
        ))}
      {votes && votes.length > 20 ? (
        <li className="pt-1.5 text-sm text-gray-500">
          {t('post_content.footer.and_more', { value: votes.length - 20 })}
        </li>
      ) : null}
      {votesAfterPayout > 0 ? (
        <li className="pt-1.5 text-sm text-gray-500" data-testid="votes-after-payout">
          {t('post_content.footer.votes_after_payout', { count: votesAfterPayout })}
        </li>
      ) : null}
    </ul>
  );
};
export default VotersDetailsData;
