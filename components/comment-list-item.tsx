import { Icons } from '@/components/icons';
import { dateToRelative } from '@/lib/parse-date';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { DefaultRenderer } from '@hiveio/content-renderer';

const CommentListItem = ({ comment }: any) => {
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
    imageProxyFn: (url: string) => 'https://images.hive.blog/1536x0/' + url,
    usertagUrlFn: (account: string) => '/@' + account,
    hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
    isLinkSafeFn: (url: string) => true
  });

  const comment_html = renderer.render(comment.body);

  return (
    <>
      <li data-testid="comment-list-item">
        <Card
          className={cn(
            'my-4 hover:bg-accent hover:text-accent-foreground  dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground'
          )}
        >
          <CardHeader>
            <div className="flex items-center" data-testid="comment-card-header">
              <img
                className="mr-3 h-[40px] w-[40px] rounded-3xl"
                height="40"
                width="40"
                src={`https://images.hive.blog/u/${comment.author}/avatar/small`}
                alt={`${comment.author} profile picture`}
                loading="lazy"
              />
              <div className="flex flex-col text-slate-500 dark:text-slate-400">
                <div>
                  <p>
                    <Link
                      href={`/@${comment.author}`}
                      className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent"
                      data-testid="comment-author-link"
                    >
                      @{comment.author}
                    </Link>{' '}
                    ({comment.author_reputation.toFixed(0)})
                  </p>
                </div>
                <p className="text-sm">
                  {`in ${comment.community_title}`}
                  <span className="mx-1">•</span>
                  {dateToRelative(comment.created)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle data-testid="comment-card-title">{comment.title}</CardTitle>
            <CardDescription
              className="prose"
              data-testid="comment-card-description"
              dangerouslySetInnerHTML={{
                __html: comment_html
              }}
            />
          </CardContent>
          <CardFooter>
            <div className="flex h-5 items-center space-x-4 text-sm" data-testid="comment-card-footer">
              <div className="flex items-center">
                <Icons.arrowUpCircle className="mr-1 h-4 w-4 cursor-pointer hover:text-red-600" />
                <Icons.arrowDownCircle className="4 mr-1 h-4 cursor-pointer hover:text-gray-600" />
              </div>
              <div className="flex items-center">
                <Icons.dollar className="mr-1 h-4 w-4 text-red-600" />
                {comment.payout.toFixed(2)}
              </div>
              <Separator orientation="vertical" />
              <div className="flex items-center">
                <Icons.star className="mr-1 h-4 w-4" />
                {comment.stats.total_votes}
              </div>
              <Separator orientation="vertical" />
              <div className="flex items-center">
                <Icons.comment className="mr-1 h-4 w-4 cursor-pointer hover:text-red-600" />
                {comment.children}
              </div>
              <Separator orientation="vertical" />
              <div className="flex items-center">
                <Icons.forward className="h-4 w-4 cursor-pointer hover:text-red-600" />
              </div>
            </div>
          </CardFooter>
        </Card>
      </li>
      <ul className="pl-10">
        {comment?.fullReplies?.map((comment: any) => (
          <CommentListItem comment={comment} key={comment.post_id} />
        ))}
      </ul>
    </>
  );
  // return (
  //   <li className="list-none" key={comment.id} data-testid="comment-list-item">
  //     <div className="mt-7 flex w-full items-center">
  //       <img
  //         className="mr-3 h-[40px] w-[40px] rounded-3xl"
  //         height="40"
  //         width="40"
  //         src={`https://images.hive.blog/u/${comment.author}/avatar`}
  //         alt={`${comment.author} profile picture`}
  //       />
  //       <div className="flex flex-col text-slate-500 dark:text-slate-400">
  //         <p>
  //           <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
  //             @{comment.author}
  //           </span>{" "}
  //           ({comment.author_reputation.toFixed(0)}) in{" "}
  //           <span>
  //             {/*<Link href={`/trending/${comment.json_metadata.tags[0]}`}>*/}
  //             {/*  #{comment.json_metadata.tags[0]}*/}
  //             {/*</Link>*/}
  //           </span>{" "}
  //           <span className="mx-1">&#x2022;</span>
  //           {moment(parseDate(comment.created)).fromNow()}
  //         </p>
  //         <p></p>
  //       </div>
  //     </div>
  //     <div className="my-4 flex flex-col items-center gap-7 md:max-h-[200px] md:flex-row md:items-start">
  //       <div key={comment.id} className="mb-10 w-full whitespace-nowrap">
  //         <h2 className="text-lg font-semibold leading-5 text-slate-900 dark:text-white">
  //           {comment.title}
  //         </h2>
  //         <p className="mt-2 mb-7 overflow-hidden text-ellipsis text-base font-normal leading-6 text-slate-500 dark:text-slate-400">
  //           {comment.body}
  //         </p>
  //         <ul className="flex">
  //           <li className="mr-4 flex items-center space-x-1">
  //             <Icons.arrowUpCircle className="h-5 w-5" />
  //             <Icons.arrowDownCircle className="h-5 w-5" />
  //             <span className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
  //               ${comment.payout.toFixed(2)}
  //             </span>
  //           </li>
  //           <li className="mr-4 flex items-center">
  //             <Icons.chevronUp className="h-5 w-5" />
  //             <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
  //               {comment.stats.total_votes}
  //             </span>
  //           </li>
  //           <li className="mr-4 flex items-center">
  //             <Icons.comment className="h-5 w-5" />
  //             <span className="ml-2 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
  //               {comment.children}
  //             </span>
  //           </li>
  //         </ul>
  //       </div>
  //     </div>
  //     <hr />
  //   </li>
  // )
};

export default CommentListItem;
