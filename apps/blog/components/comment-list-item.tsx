import { Icons } from '@hive/ui/components/icons';
import parseDate, { dateToFullRelative } from '@hive/ui/lib/parse-date';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@hive/ui/components/card';
import { cn } from '@hive/ui/lib/utils';
import Link from 'next/link';
import { Separator } from '@ui/components/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import { useEffect, useRef, useState } from 'react';
import DetailsCardVoters from '@/blog/components/details-card-voters';
import { ReplyTextbox } from './reply-textbox';
import { useRouter } from 'next/router';
import DetailsCardHover from './details-card-hover';
import type { Entry, IFollowList } from '@transaction/lib/bridge';
import clsx from 'clsx';
import { Badge } from '@ui/components/badge';
import { useTranslation } from 'next-i18next';
import VotesComponent from './votes';
import { useLocalStorage } from 'usehooks-ts';
import { useUser } from '@smart-signer/lib/auth/use-user';
import DialogLogin from './dialog-login';
import { UserPopoverCard } from './user-popover-card';
import { CommentDeleteDialog } from './comment-delete-dialog';
import moment from 'moment';
import dmcaUserList from '@hive/ui/config/lists/dmca-user-list';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import RendererContainer from './rendererContainer';
import { useDeleteCommentMutation } from './hooks/use-comment-mutations';
import { handleError } from '@ui/lib/utils';
import { CircleSpinner } from 'react-spinners-kit';
import MutePostDialog from './mute-post-dialog';
import ChangeTitleDialog from './change-title-dialog';

interface CommentListProps {
  permissionToMute: Boolean;
  comment: Entry;
  parent_depth: number;
  mutedList: IFollowList[];
  parentPermlink: string;
}

const CommentListItem = ({
  permissionToMute,
  comment,
  parent_depth,
  mutedList,
  parentPermlink
}: CommentListProps) => {
  const { t } = useTranslation('common_blog');
  const username = comment.author;
  const router = useRouter();
  const { user } = useUser();
  const ref = useRef<HTMLTableRowElement>(null);
  const [hiddenComment, setHiddenComment] = useState(
    comment.stats?.gray || mutedList?.some((x) => x.name === comment.author)
  );
  const [openState, setOpenState] = useState<boolean>(comment.stats?.gray && hiddenComment ? false : true);
  const commentId = `@${username}/${comment.permlink}`;
  const storageId = `replybox-/${username}/${comment.permlink}`;
  const [edit, setEdit] = useState(false);
  const [storedBox, storeBox, removeBox] = useLocalStorage<Boolean>(storageId, false);
  const [reply, setReply] = useState<Boolean>(storedBox !== undefined ? storedBox : false);
  const userFromDMCA = dmcaUserList.some((e) => e === comment.author);
  const legalBlockedUser = userIllegalContent.some((e) => e === comment.author);
  const userFromGDPR = gdprUserList.some((e) => e === comment.author);
  const parentFromGDPR = gdprUserList.some((e) => e === comment.parent_author);

  useEffect(() => {
    if (reply) {
      storeBox(reply);
    }
  }, [reply]);

  const currentDepth = comment.depth - parent_depth;

  const deleteCommentMutation = useDeleteCommentMutation();
  const deleteComment = async (permlink: string) => {
    try {
      await deleteCommentMutation.mutateAsync({ permlink });
    } catch (error) {
      handleError(error, { method: 'deleteComment', params: { permlink } });
    }
  };

  // Receive output from dialog and do action according to user's
  // response.
  const dialogAction = (permlink: string): void => {
    if (permlink) {
      deleteComment(permlink);
    }
  };

  if (userFromGDPR || parentFromGDPR) {
    return null;
  }
  return (
    <>
      {currentDepth < 8 ? (
        <li data-testid="comment-list-item">
          <div className="flex" id={commentId} ref={ref}>
            <img
              className={clsx('mr-3 hidden  rounded-3xl sm:block', {
                'mx-[15px] h-[25px] w-[25px] opacity-50': hiddenComment,
                'h-[40px] w-[40px]': !hiddenComment
              })}
              height="40"
              width="40"
              src={`https://images.hive.blog/u/${username}/avatar/small`}
              alt={`${username} profile picture`}
              loading="lazy"
            />
            <Card
              className={cn(`mb-4 w-full bg-background text-primary depth-${comment.depth}`, {
                'opacity-50 hover:opacity-100': hiddenComment
              })}
            >
              <Accordion type="single" defaultValue={!hiddenComment ? 'item-1' : undefined} collapsible>
                <AccordionItem className="p-0" value="item-1">
                  <CardHeader className="px-1 py-0">
                    <div className="flex w-full justify-between">
                      <div
                        className="flex w-full flex-col sm:flex-row sm:items-center"
                        data-testid="comment-card-header"
                      >
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="my-1 flex items-center">
                            <img
                              className=" h-[20px] w-[20px] rounded-3xl sm:hidden"
                              height="20"
                              width="20"
                              src={`https://images.hive.blog/u/${username}/avatar/small`}
                              alt={`${username} profile picture`}
                              loading="lazy"
                            />
                            <UserPopoverCard
                              author={username}
                              author_reputation={comment.author_reputation}
                              blacklist={comment.blacklists}
                            />
                            {comment.author_title ? (
                              <Badge
                                variant="outline"
                                className="mr-1 border-destructive"
                                data-testid="comment-user-affiliation-tag"
                              >
                                <span className="mr-1">{comment.author_title}</span>
                                <ChangeTitleDialog
                                  permlink={parentPermlink}
                                  moderateEnabled={permissionToMute}
                                  userOnList={comment.author}
                                  title={comment.author_title ?? ''}
                                  community={comment.community ?? ''}
                                />
                              </Badge>
                            ) : (
                              <ChangeTitleDialog
                                permlink={parentPermlink}
                                moderateEnabled={permissionToMute}
                                userOnList={comment.author}
                                title={comment.author_title ?? ''}
                                community={comment.community ?? ''}
                              />
                            )}
                            <Link
                              href={`/${router.query.param}/${router.query.p2}/${router.query.permlink}#@${username}/${comment.permlink}`}
                              className="hover:text-destructive md:text-sm"
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
                              <div className="flex items-center hover:cursor-pointer hover:text-destructive ">
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
                  </CardHeader>
                  <AccordionContent className="py-0">
                    <Separator orientation="horizontal" />
                    <CardContent className="px-2 py-1 hover:bg-background-tertiary">
                      {legalBlockedUser ? (
                        <div className="px-2 py-6">{t('global.unavailable_for_legal_reasons')}</div>
                      ) : userFromDMCA ? (
                        <div className="px-2 py-6">{t('post_content.body.copyright')}</div>
                      ) : edit && comment.parent_permlink && comment.parent_author ? (
                        <ReplyTextbox
                          editMode={edit}
                          onSetReply={setEdit}
                          username={comment.parent_author}
                          permlink={comment.permlink}
                          parentPermlink={comment.parent_permlink}
                          storageId={storageId}
                          comment={comment}
                        />
                      ) : (
                        <CardDescription
                          className="prose flex max-w-full break-words"
                          data-testid="comment-card-description"
                        >
                          <RendererContainer
                            body={comment.body}
                            author={comment.author}
                            className="text-primary"
                          />
                        </CardDescription>
                      )}
                    </CardContent>
                    <Separator orientation="horizontal" />{' '}
                    <CardFooter className="px-2 py-1">
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
                            className={clsx('flex items-center hover:cursor-pointer hover:text-destructive', {
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
                                <span className="hover:text-destructive">
                                  {comment.stats && comment.stats.total_votes > 1
                                    ? t('cards.post_card.votes', { votes: comment.stats.total_votes })
                                    : t('cards.post_card.vote')}
                                </span>
                              </DetailsCardVoters>
                            </div>
                            <Separator orientation="vertical" className="h-5" />
                          </>
                        ) : null}
                        {user && user.isLoggedIn ? (
                          <button
                            disabled={deleteCommentMutation.isLoading}
                            onClick={() => {
                              setReply(!reply), removeBox();
                            }}
                            className="flex items-center hover:cursor-pointer hover:text-destructive"
                            data-testid="comment-card-footer-reply"
                          >
                            {t('cards.comment_card.reply')}
                          </button>
                        ) : (
                          <DialogLogin>
                            <button
                              className="flex items-center hover:cursor-pointer hover:text-destructive"
                              data-testid="comment-card-footer-reply"
                            >
                              {t('post_content.footer.reply')}
                            </button>
                          </DialogLogin>
                        )}
                        {user && user.isLoggedIn && comment.author === user.username ? (
                          <>
                            <Separator orientation="vertical" className="h-5" />
                            <button
                              disabled={deleteCommentMutation.isLoading}
                              onClick={() => {
                                setEdit(!edit);
                              }}
                              className="flex items-center hover:cursor-pointer hover:text-destructive"
                              data-testid="comment-card-footer-edit"
                            >
                              {t('cards.comment_card.edit')}
                            </button>
                          </>
                        ) : null}
                        {permissionToMute ? (
                          <MutePostDialog
                            community={comment.community ?? ''}
                            username={comment.author}
                            permlink={comment.permlink}
                            contentMuted={comment.stats?.gray ?? false}
                          />
                        ) : null}
                        {comment.replies.length === 0 &&
                        user.isLoggedIn &&
                        comment.author === user.username &&
                        moment().format('YYYY-MM-DDTHH:mm:ss') < comment.payout_at ? (
                          <>
                            <Separator orientation="vertical" className="h-5" />
                            <CommentDeleteDialog permlink={comment.permlink} action={dialogAction}>
                              <button
                                disabled={edit || deleteCommentMutation.isLoading}
                                className="flex items-center hover:cursor-pointer hover:text-destructive"
                                data-testid="comment-card-footer-delete"
                              >
                                {deleteCommentMutation.isLoading ? (
                                  <CircleSpinner
                                    loading={deleteCommentMutation.isLoading}
                                    size={18}
                                    color="#dc2626"
                                  />
                                ) : (
                                  t('cards.comment_card.delete')
                                )}
                              </button>
                            </CommentDeleteDialog>
                          </>
                        ) : null}
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
          <Link href={`/${comment.category}/@${username}/${comment.permlink}`} className="text-destructive">
            {t('cards.comment_card.load_more')}...
          </Link>
        </div>
      ) : null}
      {reply && user && user.isLoggedIn ? (
        <ReplyTextbox
          editMode={edit}
          onSetReply={setReply}
          username={username}
          permlink={comment.permlink}
          storageId={storageId}
          comment=""
        />
      ) : null}
    </>
  );
};

export default CommentListItem;
