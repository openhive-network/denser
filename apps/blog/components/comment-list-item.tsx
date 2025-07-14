import { Icons } from '@hive/ui/components/icons';
import parseDate from '@hive/ui/lib/parse-date';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@hive/ui/components/card';
import { cn } from '@hive/ui/lib/utils';
import Link from 'next/link';
import { Separator } from '@ui/components/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import { useEffect, useRef, useState } from 'react';
import DetailsCardVoters from '@/blog/components/details-card-voters';
import { ReplyTextbox } from './reply-textbox';
import DetailsCardHover from './details-card-hover';
import { IFollowList, Entry, JsonMetadata } from '@transaction/lib/extended-hive.chain';
import clsx from 'clsx';
import { Badge } from '@ui/components/badge';
import { useTranslation } from 'next-i18next';
import VotesComponent from './votes';
import { useLocalStorage } from 'usehooks-ts';
import { useUser } from '@smart-signer/lib/auth/use-user';
import DialogLogin from './dialog-login';
import { UserPopoverCard } from './user-popover-card';
import { PostDeleteDialog } from './post-delete-dialog';
import moment from 'moment';
import dmcaUserList from '@hive/ui/config/lists/dmca-user-list';
import userIllegalContent from '@hive/ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import RendererContainer from './rendererContainer';
import { useDeleteCommentMutation } from './hooks/use-comment-mutations';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import MutePostDialog from './mute-post-dialog';
import ChangeTitleDialog from './change-title-dialog';
import { AlertDialogFlag } from './alert-window-flag';
import FlagTooltip from './flag-icon';
import TimeAgo from '@hive/ui/components/time-ago';
import Renderer from '../features/renderer/renderer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@ui/components/dropdown-menu';
import { Check, MoreHorizontal } from 'lucide-react';
interface CommentListProps {
  permissionToMute: Boolean;
  comment: Entry;
  parent_depth: number;
  mutedList: IFollowList[];
  parentPermlink: string;
  parentAuthor: string;
  flagText: string | undefined;
}
export const commentClassName =
  'font-sanspro text-[12.5px] prose-h1:text-[20px] prose-h2:text-[17.5px] prose-h4:text-[13.7px] sm:text-[13.4px] sm:prose-h1:text-[21.5px] sm:prose-h2:text-[18.7px] sm:prose-h3:text-[16px]  sm:prose-h4:text-[14.7px] lg:text-[14.6px] lg:prose-h1:text-[23.3px] lg:prose-h2:text-[20.4px] lg:prose-h3:text-[17.5px] lg:prose-h4:text-[16px] prose-h3:text-[15px] prose-p:mb-[9.6px] prose-p:mt-[1.6px] last:prose-p:mb-[3.2px] prose-img:max-w-[400px] prose-img:max-h-[400px]';

const CommentListItem = ({
  permissionToMute,
  comment,
  parent_depth,
  mutedList,
  parentPermlink,
  parentAuthor,
  flagText
}: CommentListProps) => {
  const { t } = useTranslation('common_blog');
  const username = comment.author;
  const { user } = useUser();
  const ref = useRef<HTMLTableRowElement>(null);
  const [hiddenComment, setHiddenComment] = useState(
    comment.stats?.gray || mutedList?.some((x) => x.name === comment.author)
  );
  const [openState, setOpenState] = useState<string>(comment.stats?.gray && hiddenComment ? '' : 'item-1');
  const [tempraryHidden, setTemporaryHidden] = useState(false);
  const commentId = `@${username}/${comment.permlink}`;
  const storageId = `replybox-/${username}/${comment.permlink}-${user.username}`;
  const [edit, setEdit] = useState(false);
  const [storedBox, storeBox, removeBox] = useLocalStorage<Boolean>(storageId, false);
  const [reply, setReply] = useState<Boolean>(storedBox !== undefined ? storedBox : false);
  const userFromDMCA = dmcaUserList.some((e) => e === comment.author);
  const legalBlockedUser = userIllegalContent.some((e) => e === comment.author);
  const userFromGDPR = gdprUserList.some((e) => e === comment.author);
  const parentFromGDPR = gdprUserList.some((e) => e === comment.parent_author);
  const [renderMethod, setRenderMethod] = useState<JsonMetadata['editorType'] | 'raw'>(
    comment?.json_metadata?.editorType || 'classic'
  );
  useEffect(() => {
    if (reply) {
      storeBox(reply);
    }
  }, [reply]);

  useEffect(() => {
    setOpenState(comment.stats?.gray && hiddenComment ? '' : 'item-1');
    setTemporaryHidden(comment.stats?.gray ? true : false);
  }, [comment.stats?.gray]);
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
                'h-[40px] w-[40px]': !hiddenComment,
                'opacity-50': tempraryHidden
              })}
              height="40"
              width="40"
              src={`https://images.hive.blog/u/${username}/avatar/small`}
              alt={`${username} profile picture`}
              loading="lazy"
            />
            <Card
              className={cn(`mb-4 w-full bg-background text-primary depth-${comment.depth}`, {
                'opacity-50 hover:opacity-100': hiddenComment || tempraryHidden
              })}
            >
              <Accordion type="single" collapsible value={openState}>
                <AccordionItem className="flex w-full flex-col p-0" value="item-1">
                  <CardHeader className="px-0 py-0">
                    <div className="flex w-full justify-between">
                      <div
                        className="flex w-full flex-col justify-start sm:flex-row sm:items-center"
                        data-testid="comment-card-header"
                      >
                        <div className="flex w-full items-center justify-between text-xs sm:text-sm">
                          <div className="my-1 flex flex-wrap items-center pl-1">
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
                              href={`#@${username}/${comment.permlink}`}
                              className="hover:text-destructive md:text-sm"
                              title={String(parseDate(comment.created))}
                              data-testid="comment-timestamp-link"
                            >
                              <TimeAgo date={comment.created} />
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
                            <div className="flex items-center">
                              {flagText && comment.community && !user.isLoggedIn ? (
                                <DialogLogin>
                                  <FlagTooltip onClick={() => {}} />
                                </DialogLogin>
                              ) : flagText && comment.community && user.isLoggedIn ? (
                                <AlertDialogFlag
                                  community={comment.community}
                                  username={username}
                                  permlink={comment.permlink}
                                  flagText={flagText}
                                >
                                  <FlagTooltip onClick={() => {}} />
                                </AlertDialogFlag>
                              ) : null}
                              <AccordionTrigger
                                className="pb-0 pt-1 !no-underline sm:hidden"
                                onClick={() => setOpenState((prev) => (prev === 'item-1' ? '' : 'item-1'))}
                              />
                            </div>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger className="cursor-pointer hover:text-destructive">
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 hover:bg-background"
                                onClick={() => setRenderMethod('classic')}
                              >
                                Legacy Renderer
                                {renderMethod === 'classic' ? <Check /> : null}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 hover:bg-background"
                                onClick={() => setRenderMethod('denser')}
                              >
                                Denser Renderer
                                {renderMethod === 'denser' ? <Check /> : null}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer gap-2 hover:bg-background"
                                onClick={() => setRenderMethod('raw')}
                              >
                                Raw Connetent
                                {renderMethod === 'raw' ? <Check /> : null}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {!hiddenComment && comment.stats?.gray && openState ? (
                          <span className="ml-4 text-xs">{t('cards.comment_card.will_be_hidden')}</span>
                        ) : null}

                        {hiddenComment ? (
                          <div className="flex w-full justify-between">
                            <AccordionTrigger
                              className="pb-0 pt-1 !no-underline "
                              onClick={() => setOpenState((prev) => (prev === 'item-1' ? '' : 'item-1'))}
                            >
                              <span
                                className="ml-4 cursor-pointer text-xs sm:text-sm"
                                onClick={() => setHiddenComment(false)}
                              >
                                {t('cards.comment_card.reveal_comment')}{' '}
                              </span>
                            </AccordionTrigger>
                            {flagText && comment.community && !user.isLoggedIn ? (
                              <DialogLogin>
                                <FlagTooltip onClick={() => {}} />
                              </DialogLogin>
                            ) : flagText && comment.community && user.isLoggedIn ? (
                              <AlertDialogFlag
                                community={comment.community}
                                username={username}
                                permlink={comment.permlink}
                                flagText={flagText}
                              >
                                <FlagTooltip onClick={() => {}} />
                              </AlertDialogFlag>
                            ) : null}
                          </div>
                        ) : null}

                        {!openState ? (
                          <div
                            className="ml-4 flex h-5 items-center gap-2 text-xs sm:text-sm"
                            data-testid="comment-card-footer"
                          >
                            <VotesComponent post={comment} type="comment" />
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
                          onClick={() => setOpenState((prev) => (prev === 'item-1' ? '' : 'item-1'))}
                        />
                      ) : null}
                    </div>
                  </CardHeader>
                  <AccordionContent className="h-fit p-0">
                    <Separator orientation="horizontal" />
                    <CardContent className="h-fit px-[5px] py-[1px] hover:bg-background-tertiary">
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
                          editorType={comment.json_metadata?.editorType || 'classic'}
                        />
                      ) : (
                        <CardDescription data-testid="comment-card-description">
                          {renderMethod === 'denser' ? (
                            <Renderer content={comment.body} className={commentClassName} />
                          ) : renderMethod === 'raw' ? (
                            <div className="mb-4 bg-secondary px-4 py-2">
                              <pre className="w-full overflow-x-scroll text-sm">{comment.body}</pre>
                            </div>
                          ) : (
                            <RendererContainer
                              body={comment.body}
                              author={comment.author}
                              className={commentClassName}
                            />
                          )}
                        </CardDescription>
                      )}
                    </CardContent>
                    <Separator orientation="horizontal" />{' '}
                    <CardFooter className="px-2 py-1">
                      <div
                        className="flex items-center gap-2 pt-1 text-xs sm:text-sm"
                        data-testid="comment-card-footer"
                      >
                        <VotesComponent post={comment} type="comment" />
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
                        {comment.replies.length === 0 &&
                        user.isLoggedIn &&
                        comment.author === user.username &&
                        moment().format('YYYY-MM-DDTHH:mm:ss') < comment.payout_at ? (
                          <>
                            <Separator orientation="vertical" className="h-5" />
                            <PostDeleteDialog
                              permlink={comment.permlink}
                              action={dialogAction}
                              label="Comment"
                            >
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
                            </PostDeleteDialog>
                          </>
                        ) : null}
                        {permissionToMute ? (
                          <MutePostDialog
                            comment={true}
                            community={comment.community ?? ''}
                            username={comment.author}
                            permlink={comment.permlink}
                            contentMuted={comment.stats?.gray ?? false}
                            discussionPermlink={parentPermlink}
                            discussionAuthor={parentAuthor}
                          />
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
          editorType="denser"
        />
      ) : null}
    </>
  );
};

export default CommentListItem;
