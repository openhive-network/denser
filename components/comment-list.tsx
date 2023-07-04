import CommentListItem from '@/components/comment-list-item';
import { Entry } from '@/lib/bridge';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@/lib/old-profixy';
import { getFeedHistory } from '@/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import clsx from 'clsx';

const CommentList = ({ data, parent }: { data: any; parent: any }) => {
  const renderer = new DefaultRenderer({
    baseUrl: 'https://hive.blog/',
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addNofollowToLinks: true,
    doNotShowImages: false,
    ipfsPrefix: '',
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url: string) => getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20')),
    usertagUrlFn: (account: string) => '/@' + account,
    hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
    isLinkSafeFn: (url: string) => false
  });
  const {
    data: historyFeedData,
    isLoading: historyFeedLoading,
    isError: historyFeedError
  } = useQuery(['feedHistory'], () => getFeedHistory());

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
    <ul className="px-2 ">
      {arr?.map((comment: any, index: number) => (
        <div
          key={`parent-${comment.post_id}-index-${index}`}
          className={clsx('px-2 sm:pl-12', {
            'm-2 border-2 border-red-600 bg-green-50 p-2': router.asPath.includes(
              `@${comment.author}/${comment.permlink}`
            )
          })}
          id={`@${data[index].author}/${data[index].permlink}`}
        >
          <CommentListItem
            historyFeedData={historyFeedData}
            comment={comment}
            renderer={renderer}
            key={`${comment.post_id}-item-${comment.depth}-index-${index}`}
          />
          {comment.children > 0 ? (
            <CommentList
              data={data}
              parent={comment}
              key={`${comment.post_id}-list-${comment.depth}-index-${index}`}
            />
          ) : null}
        </div>
      ))}
    </ul>
  );
};
export default CommentList;
