import CommentListItem from '@/components/comment-list-item';
import { Entry } from '@/lib/bridge';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@/lib/old-profixy';

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

  let filtered = data.filter((x: Entry) => {
    return x?.parent_author === parent?.author && x?.parent_permlink === parent?.permlink;
  });

  let mutedContent = filtered.filter(
    (item: any) => parent && item.depth === 1 && item.parent_author === parent.author
  );

  let unmutedContent = filtered.filter((md: any) =>
    mutedContent.every((fd: any) => fd.post_id !== md.post_id)
  );

  const arr = [...mutedContent, ...unmutedContent];

  return (
    <ul className="pl-12">
      {arr?.map((comment: any, index: number) => (
        <div key={`parent-${comment.post_id}-index-${index}`}>
          <CommentListItem
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
