import { Icons } from '@/components/icons';
import { dateToRelative } from '@/lib/parse-date';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DialogLogin from '@/components/dialog-login';
import DetailsCardVoters from '@/components/details-card-voters';
import { ReplyTextbox } from './reply-textbox';
import { useRouter } from 'next/router';
import DetailsCardHover from './details-card-hover';
import { UserHoverCard } from './user-info';
import Big from 'big.js';
import { Entry } from '@/lib/bridge';
import { useActiveVotesQuery } from './hooks/use-active-votes';
import clsx from 'clsx';
import { useAccountQuery } from './hooks/use-accout';
import { useFollowsQuery } from './hooks/use-follows';
import { Badge } from '@/components/ui/badge';
import { DefaultRenderer } from '@hiveio/content-renderer';

const CommentListItem = ({
  comment,
  renderer,
  price_per_hive,
  parent_depth
}: {
  comment: Entry;
  renderer: DefaultRenderer;
  price_per_hive: Big;
  parent_depth: number;
}) => {
  const username = comment.author;
  const router = useRouter();
  const ref = useRef<HTMLTableRowElement>(null);
  const [hiddenComment, setHiddenComment] = useState(comment.stats?.gray);

  const [openState, setOpenState] = useState<boolean>(comment.stats?.gray && hiddenComment ? false : true);
  const [reply, setReply] = useState(false);
  const activeVotes = useActiveVotesQuery(username, comment.permlink);
  const follows = useFollowsQuery(username);
  const account = useAccountQuery(username);

  const comment_html = renderer.render(comment.body);
  const commentId = `@${username}/${comment.permlink}`;
  useEffect(() => {
    //without delay moving to right scroll position but after that imgs loading and we are in wrong scroll position
    const timeout = setTimeout(() => {
      if (router.asPath.includes(commentId) && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [router.asPath]);
  const currentDepth = comment.depth - parent_depth;

  return (
    <>
      {currentDepth < 8 ? (
        <li data-testid="comment-list-item">
          <div className="flex" id={commentId} ref={ref}>
            <img
              className={clsx('mr-3 hidden  rounded-3xl sm:block', {
                'mx-[15px] h-[25px] w-[25px] opacity-50': comment.stats?.gray,
                'h-[40px] w-[40px]': !comment.stats?.gray
              })}
              height="40"
              width="40"
              src={`https://images.hive.blog/u/${username}/avatar/small`}
              alt={`${username} profile picture`}
              loading="lazy"
            />
            <Card
              className={cn(
                `mb-4 w-full px-2 hover:bg-accent dark:bg-slate-700 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground depth-${comment.depth}`,
                { 'opacity-50 hover:opacity-100': comment.stats?.gray }
              )}
            >
              <Accordion type="single" defaultValue={!hiddenComment ? 'item-1' : undefined} collapsible>
                <AccordionItem value="item-1">
                  <CardHeader className="px-0 py-1 ">
                    <div className="flex w-full justify-between">
                      <div
                        className="flex w-full flex-col sm:flex-row sm:items-center"
                        data-testid="comment-card-header"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                          <div className="my-1 flex items-center">
                            <img
                              className=" h-[20px] w-[20px] rounded-3xl sm:hidden"
                              height="20"
                              width="20"
                              src={`https://images.hive.blog/u/${username}/avatar/small`}
                              alt={`${username} profile picture`}
                              loading="lazy"
                            />
                            {!follows.isLoading &&
                            follows.data &&
                            !account.isLoading &&
                            account.data &&
                            account.data.posting_json_metadata ? (
                              <UserHoverCard
                                name={JSON.parse(account.data.posting_json_metadata)?.profile?.name}
                                author={username}
                                author_reputation={comment.author_reputation}
                                following={follows.data.following_count}
                                followers={follows.data.follower_count}
                                about={JSON.parse(account.data.posting_json_metadata)?.profile?.about}
                                joined={account.data.created}
                                active={account.data.last_vote_time}
                              />
                            ) : null}
                            {comment.author_title ? (
                              <Badge variant="outline" className="mr-1 border-red-600 text-slate-500">
                                {comment.author_title}
                              </Badge>
                            ) : null}
                            <Link
                              href={`/${router.query.param}/${router.query.p2}/${router.query.permlink}#@${username}/${comment.permlink}`}
                              className="text- hover:text-red-500 md:text-sm"
                            >
                              {dateToRelative(comment.created)} ago
                            </Link>
                            <Link
                              className="p-1 sm:p-2"
                              href={`/${comment.category}/@${username}/${comment.permlink}`}
                            >
                              <Icons.link className="h-3 w-3" />
                            </Link>
                          </div>
                          {!hiddenComment ? (
                            <AccordionTrigger
                              className="pb-0 pt-1 !no-underline sm:hidden"
                              onClick={() => setOpenState((val) => !val)}
                            />
                          ) : null}
                        </div>
                        {!hiddenComment && comment.stats?.gray && openState ? (
                          <span className="ml-4 text-xs">Will be hidden due to low rating </span>
                        ) : null}
                        {hiddenComment ? (
                          <AccordionTrigger
                            className="pb-0 pt-1 !no-underline "
                            onClick={() => setOpenState((val) => !val)}
                          >
                            <span
                              className="ml-4 cursor-pointer text-xs sm:text-sm"
                              onClick={() => setHiddenComment(false)}
                            >
                              Reveal Comment{' '}
                            </span>
                          </AccordionTrigger>
                        ) : null}
                        {!openState ? (
                          <div
                            className="ml-4 flex h-5 items-center gap-2 text-xs sm:text-sm"
                            data-testid="comment-card-footer"
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <DialogLogin>
                                    <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
                                  </DialogLogin>
                                </TooltipTrigger>
                                <TooltipContent>Upvote</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <DialogLogin>
                                    <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
                                  </DialogLogin>
                                </TooltipTrigger>
                                <TooltipContent>Downvote</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <DetailsCardHover
                              post={comment}
                              price_per_hive={price_per_hive}
                              decline={Number(comment.max_accepted_payout.slice(0, 1)) === 0}
                            >
                              <div className="flex items-center hover:cursor-pointer hover:text-red-600 ">
                                {'$'} {comment.payout.toFixed(2)}
                              </div>
                            </DetailsCardHover>
                            {comment.children ? (
                              <>
                                <Separator orientation="vertical" />
                                <div className="flex items-center">
                                  {comment.children}
                                  {comment.children > 1 ? ' replies' : ' reply'}
                                </div>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {!hiddenComment ? (
                        <AccordionTrigger
                          className="mr-2 hidden pb-0 pt-1 !no-underline sm:block"
                          onClick={() => setOpenState((val) => !val)}
                        />
                      ) : null}
                    </div>
                  </CardHeader>{' '}
                  <Separator orientation="horizontal" />
                  <AccordionContent className="p-0">
                    <CardContent className="pb-2 ">
                      <CardDescription
                        className="prose break-words"
                        data-testid="comment-card-description"
                        dangerouslySetInnerHTML={{
                          __html: comment_html
                        }}
                      />
                    </CardContent>
                    <Separator orientation="horizontal" />{' '}
                    <CardFooter>
                      <div
                        className="flex items-center gap-2 pt-1 text-xs sm:text-sm"
                        data-testid="comment-card-footer"
                      >
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <DialogLogin>
                                  <Icons.arrowUpCircle className="h-[18px] w-[18px] rounded-xl text-red-600 hover:bg-red-600 hover:text-white sm:mr-1" />
                                </DialogLogin>
                              </TooltipTrigger>
                              <TooltipContent>Upvote</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <DialogLogin>
                                  <Icons.arrowDownCircle className="h-[18px] w-[18px] rounded-xl text-gray-600 hover:bg-gray-600 hover:text-white sm:mr-1" />
                                </DialogLogin>
                              </TooltipTrigger>
                              <TooltipContent>Downvote</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <DetailsCardHover
                          post={comment}
                          price_per_hive={price_per_hive}
                          decline={Number(comment.max_accepted_payout.slice(0, 1)) === 0}
                        >
                          <div className="flex items-center hover:cursor-pointer hover:text-red-600 ">
                            {'$'} {comment.payout.toFixed(2)}
                          </div>
                        </DetailsCardHover>
                        <Separator orientation="vertical" className="h-5" />
                        {!activeVotes.isLoading &&
                        activeVotes.data &&
                        comment.stats &&
                        comment.stats.total_votes > 0 ? (
                          <>
                            <div className="flex items-center">
                              <DetailsCardVoters activeVotesData={activeVotes.data} post={comment}>
                                <span className="hover:text-red-600">
                                  {comment.stats?.total_votes}
                                  {comment.stats.total_votes > 1 ? ' votes' : ' vote'}
                                </span>
                              </DetailsCardVoters>
                            </div>
                            <Separator orientation="vertical" className="h-5" />
                          </>
                        ) : null}
                        <button
                          onClick={() => setReply(!reply)}
                          className="flex items-center hover:cursor-pointer hover:text-red-600"
                        >
                          Reply
                        </button>
                      </div>
                    </CardFooter>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </div>
        </li>
      ) : currentDepth === 8 ? (
        <div className="h-8">
          <Link href={`/${comment.category}/@${username}/${comment.permlink}`} className="text-red-500">
            Load more...
          </Link>
        </div>
      ) : null}
      {reply ? <ReplyTextbox onSetReply={setReply} /> : null}
    </>
  );
};

export default CommentListItem;
