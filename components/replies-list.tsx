import RepliesListItem from '@/components/replies-list-item';

const RepliesList = ({ data, parent }: { data: any; parent?: any }) => {
  if (parent) {
    let filtered = data.filter(
      (x: any) => x.parent_author === parent.author && x.parent_permlink === parent.permlink
    );

    let mutedContent = filtered.filter(
      (item: any) => parent && item.depth === 1 && item.parent_author === parent.author
    );

    let unmutedContent = filtered.filter((md: any) =>
      mutedContent.every((fd: any) => fd.post_id !== md.post_id)
    );

    const arr = [...mutedContent, ...unmutedContent];
    const subReplies = data.filter(
      (x: any) => x.parent_author !== parent.author && x.parent_permlink !== parent.permlink
    );
    const tmp = arr.map((cm: any) => {
      const srFiltered = [];
      if (cm.replies.length > 0) {
        for (const rp of cm.replies) {
          srFiltered.push(...subReplies.filter((sr: any) => sr.url.split('#')[1]?.slice(1) === rp));
        }
      }
      return {
        ...cm,
        fullReplies: srFiltered
      };
    });

    return (
      <ul className="p-2">
        {tmp?.map((comment: any) => (
          <RepliesListItem comment={comment} key={comment.post_id} />
        ))}
      </ul>
    );
  }

  return (
    <ul className="p-2">
      {data?.map((comment: any) => (
        <RepliesListItem comment={comment} key={comment.post_id} />
      ))}
    </ul>
  );
};
export default RepliesList;
