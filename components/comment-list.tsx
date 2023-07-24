import CommentListItem from '@/components/comment-list-item';
import { Entry } from '@/lib/bridge';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@/lib/old-profixy';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import Big from 'big.js';

const CommentList = ({
  data,
  parent,
  price_per_hive,
  parent_depth
}: {
  data: Entry[];
  parent: Entry;
  price_per_hive: Big;
  parent_depth: number;
}) => {
  const renderer = new DefaultRenderer({
    baseUrl: 'https://hive.blog/',
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addNofollowToLinks: true,
    addTargetBlankToLinks: true,
    addCssClassToLinks: 'external-link',
    doNotShowImages: false,
    ipfsPrefix: '',
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url: string) => getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20')),
    usertagUrlFn: (account: string) => '/@' + account,
    hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
    isLinkSafeFn: (url: string) => false
  });

  let filtered = data.filter((x: Entry) => {
    return x?.parent_author === parent?.author && x?.parent_permlink === parent?.permlink;
  });

  let mutedContent = filtered.filter(
    (item: any) => parent && item.depth === 1 && item.parent_author === parent.author
  );

  let unmutedContent = filtered.filter((md: any) =>
    mutedContent.every((fd: any) => fd.post_id !== md.post_id)
  );
  const router = useRouter();
  const arr = [...mutedContent, ...unmutedContent];
  return (
    <ul>
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
            price_per_hive={price_per_hive}
            comment={comment}
            renderer={renderer}
            key={`${comment.post_id}-item-${comment.depth}-index-${index}`}
            parent_depth={parent_depth}
          />
          {comment.children > 0 ? (
            <CommentList
              data={data}
              parent={comment}
              key={`${comment.post_id}-list-${comment.depth}-index-${index}`}
              price_per_hive={price_per_hive}
              parent_depth={parent_depth}
            />
          ) : null}
        </div>
      ))}
    </ul>
  );
};
export default CommentList;
