import { Icons } from '@hive/ui/components/icons';
import parseDate, { dateToFullRelative } from '@hive/ui/lib/parse-date';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@hive/ui/components/card';
import { cn } from '@/blog/lib/utils';
import Link from 'next/link';
import { Separator } from '@hive/ui/components/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@hive/ui/components/accordion';
import { useEffect, useRef, useState } from 'react';
import DetailsCardVoters from '@/blog/components/details-card-voters';
import { ReplyTextbox } from './reply-textbox';
import { useRouter } from 'next/router';
import DetailsCardHover from './details-card-hover';
import { Entry } from '@ui/lib/bridge';
import clsx from 'clsx';
import { Badge } from '@hive/ui/components/badge';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { UserHoverCard } from './user-hover-card';
import { useTranslation } from 'next-i18next';
import VotesComponent from './votes';

const CommentListItem = ({
  comment,
  renderer,
  parent_depth
}: {
  comment: Entry;
  renderer: DefaultRenderer;
  parent_depth: number;
}) => {
  const { t } = useTranslation('common_blog');
  const username = comment.author;
  const router = useRouter();
  const ref = useRef<HTMLTableRowElement>(null);
  const [hiddenComment, setHiddenComment] = useState(comment.stats?.gray);

  const [openState, setOpenState] = useState<boolean>(comment.stats?.gray && hiddenComment ? false : true);
  const [reply, setReply] = useState(false);

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
                            <UserHoverCard
                              author={username}
                              author_reputation={comment.author_reputation}
                              blacklist={comment.blacklists}
                            />
                            {comment.author_title ? (
                              <Badge
                                variant="outline"
                                className="mr-1 border-red-600 text-slate-500"
                                data-testid="comment-user-affiliation-tag"
                              >
                                {comment.author_title}
                              </Badge>
                            ) : null}
                            <Link
                              href={`/${router.query.param}/${router.query.p2}/${router.query.permlink}#@${username}/${comment.permlink}`}
                              className="text- hover:text-red-500 md:text-sm"
                              title={String(parseDate(comment.created))}
                              data-testid="comment-timestamp-link"
                            >
                              {dateToFullRelative(comment.created, t)}
                            </Link>
                            <Link
                              className="p-1 sm:p-2"
                              href={`/${comment.category}/@${username}/${comment.permlink}`}
                              data-testid="comment-page-link"
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
                          <span className="ml-4 text-xs">{t('cards.comment_card.will_be_hidden')}</span>
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
                              {t('cards.comment_card.reveal_comment')}{' '}
                            </span>
                          </AccordionTrigger>
                        ) : null}
                        {!openState ? (
                          <div
                            className="ml-4 flex h-5 items-center gap-2 text-xs sm:text-sm"
                            data-testid="comment-card-footer"
                          >
                            <VotesComponent post={comment} />

                            <DetailsCardHover
                              post={comment}
                              decline={Number(comment.max_accepted_payout.slice(0, 1)) === 0}
                            >
                              <div className="flex items-center hover:cursor-pointer hover:text-red-600 ">
                                {'$'}
                                {comment.payout.toFixed(2)}
                              </div>
                            </DetailsCardHover>
                            {comment.children ? (
                              <>
                                <Separator orientation="vertical" />
                                <div className="flex items-center">
                                  {comment.children}{' '}
                                  {comment.children > 1
                                    ? t('cards.comment_card.replies')
                                    : t('cards.comment_card.one_reply')}
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
                        <VotesComponent post={comment} />
                        <DetailsCardHover
                          post={comment}
                          decline={Number(comment.max_accepted_payout.slice(0, 1)) === 0}
                        >
                          <div
                            data-testid="comment-card-footer-payout"
                            className={clsx('flex items-center hover:cursor-pointer hover:text-red-600', {
                              'line-through opacity-50': Number(comment.max_accepted_payout.slice(0, 1)) === 0
                            })}
                          >
                            {'$'}
                            {comment.payout.toFixed(2)}
                          </div>
                        </DetailsCardHover>
                        <Separator orientation="vertical" className="h-5" />
                        {comment.stats && comment.stats.total_votes > 0 ? (
                          <>
                            <div className="flex items-center">
                              <DetailsCardVoters post={comment}>
                                <span className="hover:text-red-600">
                                  {comment.stats && comment.stats.total_votes > 1
                                    ? t('cards.post_card.votes', { votes: comment.stats.total_votes })
                                    : t('cards.post_card.vote')}
                                </span>
                              </DetailsCardVoters>
                            </div>
                            <Separator orientation="vertical" className="h-5" />
                          </>
                        ) : null}
                        <button
                          onClick={() => setReply(!reply)}
                          className="flex items-center hover:cursor-pointer hover:text-red-600"
                          data-testid="comment-card-footer-reply"
                        >
                          {t('cards.comment_card.reply')}
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
            {t('cards.comment_card.load_more')}...
          </Link>
        </div>
      ) : null}
      {reply ? <ReplyTextbox onSetReply={setReply} username={username} permlink={comment.permlink} /> : null}
    </>
  );
};

export default CommentListItem;
