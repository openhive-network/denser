import { Icons } from '@/components/icons';
import { dateToRelative } from '@/lib/parse-date';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCallback, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DialogLogin from '@/components/dialog-login';
import DetailsCardHover from "@/components/details-card-hover";
import DetailsCardVoters from "@/components/details-card-voters";
import {useQuery} from "@tanstack/react-query";
import {getActiveVotes} from "@/lib/hive";

const CommentListItem = ({ comment, renderer}: any) => {
  const [openState, setOpenState] = useState('open');
  const {
    data: activeVotesDataComments,
    isLoading: isActiveVotesDataCommentsLoading,
    isError: activeVotesDataCommentsError
  } = useQuery(['activeVotesDataComments'], () => getActiveVotes(comment.author
    , comment.permlink));

  const triggerOpenRef = useCallback((node: any) => {
    if (node !== null) {
      setOpenState(node.attributes[3].nodeValue);
    }
  }, []);

  const comment_html = renderer.render(comment.body);

  return (
    <>
      <li data-testid="comment-list-item">
        <div className="flex">
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
                <AccordionTrigger className="py-1 !no-underline" ref={triggerOpenRef}>
                  <CardHeader className="p-0">
                    <div className="flex items-center" data-testid="comment-card-header">
                      <div className="flex text-slate-500 dark:text-slate-400">
                        <span className="text-xs md:text-sm">
                          <Link
                            href={`/@${comment.author}`}
                            className="font-medium text-black hover:cursor-pointer hover:text-red-600 dark:text-white"
                            data-testid="comment-author-link"
                          >
                            @{comment.author}
                          </Link>{' '}
                          ({comment.author_reputation.toFixed(0)})
                        </span>
                        <span className="ml-1 text-xs md:text-sm">{dateToRelative(comment.created)} ago</span>
                      </div>
                      {openState === 'closed' ? (
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
                            <Icons.dollar className="mr-1 h-4 w-4 text-red-600" />
                            {comment.payout.toFixed(2)}
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
                      className="prose"
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
                      <div className="flex items-center">
                        <Icons.dollar className="mr-1 h-4 w-4 text-red-600" />
                        {comment.payout.toFixed(2)}
                      </div>
                      <Separator orientation="vertical" />
                      {!isActiveVotesDataCommentsLoading && activeVotesDataComments && comment.stats.total_votes > 0 ? (
                        <>
                          <div className="flex items-center">
                            <DetailsCardVoters activeVotesData={activeVotesDataComments} post={comment}>
                              <span className="hover:text-red-600">{comment.stats?.total_votes}{comment.stats.total_votes > 1 ? ' votes' : ' vote'}</span>
                            </DetailsCardVoters>
                          </div>
                          <Separator orientation="vertical" />
                        </>
                      ) : null}
                      <div className="flex items-center hover:text-red-600 hover:cursor-pointer">Reply</div>
                    </div>
                  </CardFooter>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </li>
    </>
  );
};

export default CommentListItem;
