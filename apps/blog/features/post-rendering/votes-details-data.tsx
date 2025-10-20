import { IVote } from '@transaction/lib/extended-hive.chain';
import { prepareVotes } from '@ui/lib/utils';
import { Entry } from '@transaction/lib/extended-hive.chain';
import BasePathLink from '../../components/base-path-link';
import { useActiveVotesQuery } from '../../components/hooks/use-active-votes';
import { useTranslation } from 'next-i18next';

export default function VotersDetailsData({ post }: { post: Entry }) {
  const { t } = useTranslation('common_blog');
  const { data } = useActiveVotesQuery(post.author, post.permlink);

  const votes = data && prepareVotes(post, data);

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
      {votes && votes.length > 20 && post.stats ? (
        <li className="pt-1.5 text-sm text-gray-500">
          {t('post_content.footer.and_more', { value: post.stats.total_votes - 20 })}
        </li>
      ) : null}
    </ul>
  );
}
