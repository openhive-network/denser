import { Vote } from '@/blog/lib/hive';
import { prepareVotes } from '@/blog/lib/utils';
import { Entry } from '@/blog/lib/bridge';
import Link from 'next/link';
import { useActiveVotesQuery } from './hooks/use-active-votes';

export default function VotersDetailsData({ post }: { post: Entry }) {
  const { data } = useActiveVotesQuery(post.author, post.permlink);

  const votes = data && prepareVotes(post, data);

  const sliced =
    votes &&
    votes
      .sort((a, b) => {
        const keyA = a['reward']!;
        const keyB = b['reward']!;
        if (keyA > keyB) return -1;
        if (keyA < keyB) return 1;
        return 0;
      })
      .slice(0, 20);

  return (
    <ul>
      {sliced &&
        sliced.map((vote: Vote, index: number) => (
          <li key={index}>
            <Link href={`/@${vote.voter}`} className="hover:cursor-pointer hover:text-red-600">
              {vote.voter}
              {vote.reward
                ? Math.abs(parseFloat(vote.reward.toString())) < 0.0001
                  ? `: $0`
                  : `: $${Number(vote.reward).toFixed(2)}`
                : null}
            </Link>
          </li>
        ))}
      {votes && votes.length > 20 && post.stats ? (
        <li className="pt-1.5 text-sm text-gray-500">and {post.stats.total_votes - 20} more</li>
      ) : null}
    </ul>
  );
}
