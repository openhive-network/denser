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
import { useQuery } from '@tanstack/react-query';
import { getActiveVotes } from '@/lib/hive';
import { ReplyTextbox } from './reply-textbox';
import { useRouter } from 'next/router';
import DetailsCardHover from './details-card-hover';
import Big from 'big.js';

interface Props {
  comment: any;
  renderer: any;
  price_per_hive?: Big;
}

const CommentListItem = ({ comment, renderer, price_per_hive }: Props) => {
  const [openState, setOpenState] = useState<boolean>(true);
  const {
    data: activeVotesDataComments,
    isLoading: isActiveVotesDataCommentsLoading,
    isError: activeVotesDataCommentsError
  } = useQuery(['activeVotesDataComments'], () => getActiveVotes(comment.author, comment.permlink));
  const ref = useRef<HTMLTableRowElement>(null);
  const router = useRouter();

  const comment_html = renderer.render(comment.body);
  const [reply, setReply] = useState(false);
  const commentId = `@${comment.author}/${comment.permlink}`;

  useEffect(() => {
    //without delay moving to right scroll position but after that imgs loading and we are in wrong scroll position
    const timeout = setTimeout(() => {
      if (router.asPath.includes(commentId) && ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <li data-testid="comment-list-item">
        <div className="flex" id={commentId} ref={ref}>
          <img
            className="mr-3 h-[40px] w-[40px] rounded-3xl"
            height="40"
            width="40"
            src={`https://images.hive.blog/u/${comment.author}/avatar/small`}
            alt={`${comment.author} profile picture`}
            loading="lazy"
          />
          <Card
            className={cn(
              `mb-4 w-full px-2 hover:bg-accent dark:bg-slate-700 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground depth-${comment.depth}`
            )}
          >
            <Accordion type="single" defaultValue="item-1" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger className="py-1 !no-underline" onClick={() => setOpenState((val) => !val)}>
                  <CardHeader className="p-0">
                    <div className="flex items-center" data-testid="comment-card-header">
                      <div className="flex items-center text-slate-500 dark:text-slate-400">
                        <span className="text-xs md:text-sm">
                          <Link
                            href={`/@${comment.author}`}
                            className="font-medium text-black hover:cursor-pointer hover:text-red-600 dark:text-white dark:hover:text-red-500"
                            data-testid="comment-author-link"
                          >
                            {comment.author}
                          </Link>{' '}
                          ({comment.author_reputation.toFixed(0)})
                        </span>
                        <span className="ml-1 text-xs hover:text-red-500 md:text-sm">
                          {dateToRelative(comment.created)} ago
                        </span>
                        <Link
                          className="p-2"
                          href={`/${comment.category}/@${comment.author}/${comment.permlink}`}
                        >
                          <Icons.link className="h-3 w-3" />
                        </Link>
                      </div>
                      {!openState ? (
                        <div
                          className="ml-4 flex h-5 items-center space-x-4 text-sm"
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
                          <div className="flex items-center">
                            {'$'} {comment.payout.toFixed(2)}
                          </div>
                          <Separator orientation="vertical" />
                          {comment.stats.total_votes ? (
                            <div className="flex items-center">
                              {comment.children}
                              {comment.children > 1 ? ' replies' : ' reply'}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </CardHeader>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <CardContent className="py-1">
                    <Separator orientation="horizontal" />
                    <CardDescription
                      className="prose break-words"
                      data-testid="comment-card-description"
                      dangerouslySetInnerHTML={{
                        __html: comment_html
                      }}
                    />
                    <Separator orientation="horizontal" />
                  </CardContent>
                  <CardFooter>
                    <div
                      className="flex h-5 items-center space-x-4 text-sm"
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
                        <div className="flex items-center hover:cursor-pointer hover:text-red-600">
                          {'$'} {comment.payout.toFixed(2)}
                        </div>
                      </DetailsCardHover>
                      <Separator orientation="vertical" />
                      {!isActiveVotesDataCommentsLoading &&
                      activeVotesDataComments &&
                      comment.stats.total_votes > 0 ? (
                        <>
                          <div className="flex items-center">
                            <DetailsCardVoters activeVotesData={activeVotesDataComments} post={comment}>
                              <span className="hover:text-red-600">
                                {comment.stats?.total_votes}
                                {comment.stats.total_votes > 1 ? ' votes' : ' vote'}
                              </span>
                            </DetailsCardVoters>
                          </div>
                          <Separator orientation="vertical" />
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
      {reply ? <ReplyTextbox onSetReply={setReply} /> : null}
    </>
  );
};

export default CommentListItem;
