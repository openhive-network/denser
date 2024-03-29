import CommentListItem from '@/blog/components/comment-list-item';
import { Entry } from '@transaction/lib/bridge';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { useContext } from 'react';
import { HiveRendererContext } from './hive-renderer-context';

const CommentList = ({
  data,
  parent,
  parent_depth
}: {
  data: Entry[];
  parent: Entry;
  parent_depth: number;
}) => {
  const { hiveRenderer } = useContext(HiveRendererContext);
  let filtered = data.filter((x: Entry) => {
    return x?.parent_author === parent?.author && x?.parent_permlink === parent?.permlink;
  });

  let mutedContent = filtered.filter(
    (item: Entry) => parent && item.depth === 1 && item.parent_author === parent.author
  );

  let unmutedContent = filtered.filter((md: Entry) =>
    mutedContent.every((fd: Entry) => fd.post_id !== md.post_id)
  );
  const router = useRouter();
  const arr = [...mutedContent, ...unmutedContent];
  return (
    <ul>
      {hiveRenderer ? (
        <>
          {arr?.map((comment: Entry, index: number) => (
            <div
              key={`parent-${comment.post_id}-index-${index}`}
              className={clsx(
                'pl-2 ',
                {
                  'm-2 border-2 border-red-600 bg-green-50 p-2 dark:bg-slate-950':
                    router.asPath.includes(`@${comment.author}/${comment.permlink}`) && comment.depth < 8
                },
                { 'pl-3 sm:pl-12': comment.depth > 1 }
              )}
              id={`@${data[index].author}/${data[index].permlink}`}
            >
              <CommentListItem
                comment={comment}
                renderer={hiveRenderer}
                key={`${comment.post_id}-item-${comment.depth}-index-${index}`}
                parent_depth={parent_depth}
              />
              {comment.children > 0 ? (
                <CommentList
                  data={data}
                  parent={comment}
                  key={`${comment.post_id}-list-${comment.depth}-index-${index}`}
                  parent_depth={parent_depth}
                />
              ) : null}
            </div>
          ))}
        </>
      ) : null}
    </ul>
  );
};
export default CommentList;
