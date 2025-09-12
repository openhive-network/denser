import RepliesListItem from '@/blog/components/replies-list-item';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { useFollowListQuery } from './hooks/use-follow-list';

const RepliesList = ({ data, parent }: { data: Entry[] | null | undefined; parent?: Entry }) => {
  const { user } = useUser();
  const { data: blacklist } = useFollowListQuery(user.username, 'blacklisted');
  if (data && parent) {
    let filtered = data.filter(
      (x: Entry) => x.parent_author === parent.author && x.parent_permlink === parent.permlink
    );

    let mutedContent = filtered.filter(
      (item: Entry) => parent && item.depth === 1 && item.parent_author === parent.author
    );

    let unmutedContent = filtered.filter((md: Entry) =>
      mutedContent.every((fd: Entry) => fd.post_id !== md.post_id)
    );

    const arr = [...mutedContent, ...unmutedContent];
    const subReplies = data.filter(
      (x: Entry) => x.parent_author !== parent.author && x.parent_permlink !== parent.permlink
    );
    const tmp = arr.map((cm: Entry) => {
      const srFiltered = [];
      if (cm.replies.length > 0) {
        for (const rp of cm.replies) {
          srFiltered.push(...subReplies.filter((sr: Entry) => sr.url.split('#')[1]?.slice(1) === rp));
        }
      }
      return {
        ...cm,
        fullReplies: srFiltered
      };
    });

    return (
      <ul className="px-2" data-testid="comment-list-replies">
        {tmp?.map((comment: Entry) => (
          <RepliesListItem blacklist={blacklist} comment={comment} key={comment.post_id} />
        ))}
      </ul>
    );
  }

  return (
    <ul className="px-2" data-testid="comment-list-replies">
      {data?.map((comment: Entry) => (
        <RepliesListItem blacklist={blacklist} comment={comment} key={comment.post_id} />
      ))}
    </ul>
  );
};
export default RepliesList;
