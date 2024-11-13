'use client';

import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Community, CommunityTeam, Entry, IFollowList } from '@transaction/lib/bridge';
import Head from 'next/head';
import env from '@beam-australia/react-env';
import { Icons } from '@ui/components/icons';
import { AlertDialogFlag } from '@/blog/features/post-view/alert-window-flag';
import { useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { ReplyTextbox } from '@/blog/features/post-view/reply-textbox';
import LoadingClient from '@ui/components/loading';
import CommentSelectFilter from '@/blog/features/post-view/comment-select-filter';
import Link from 'next/link';
import { Separator } from '@ui/components/separator';
import { Button } from '@ui/components/button';
import { Clock, Link2 } from 'lucide-react';
import { Badge } from '@ui/components/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import DialogLogin from '@/blog/components/dialog-login';
import parseDate, { dateToFullRelative } from '@ui/lib/parse-date';
import { usePinMutation, useUnpinMutation } from '@/blog/components/hooks/use-pin-mutations';
import { CircleSpinner } from 'react-spinners-kit';
import { handleError } from '@ui/lib/utils';
import Renderer from '@/blog/components/renderer/components/rendererClient';
import UserInfo from '@/blog/features/post-view/user-info';
import FacebookShare from '@/blog/components/share-post-facebook';
import TwitterShare from '@/blog/components/share-post-twitter';
import LinkedInShare from '@/blog/components/share-post-linkedin';
import RedditShare from '@/blog/components/share-post-reddit';
import { SharePost } from '@/blog/components/share-post-dialog';
import ReblogTrigger from '@/blog/components/reblog-trigger';

const Content = ({
  entryData,
  communityData,
  params,
  discussion,
  userCanModerate,
  mutedListData,
  postUrl,
  parentUrl
}: {
  mutedListData: IFollowList[];
  entryData: Entry;
  communityData: Community | undefined | null;
  params: { community: string; username: string; tag: string };
  discussion: { discussionIsLoading: boolean; discussionState: Entry[] | undefined };
  userCanModerate: boolean;
  postUrl: string | undefined;
  parentUrl: string | undefined;
}) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const { community, username, tag } = params;
  const storageId = `replybox-/${username}/${tag}`;
  const [storedBox, storeBox, removeBox] = useLocalStorage<Boolean>(storageId, false);
  const [storedComment, storeCommment, removeCommment] = useLocalStorage<string>(
    `replyTo-/${username}/${tag}`,
    ''
  );
  const [reply, setReply] = useState<Boolean>(storedBox !== undefined ? storedBox : false);
  const [edit, setEdit] = useState(false);
  const { discussionIsLoading, discussionState } = discussion;
  const commentSite = entryData.depth !== 0 ? true : false;
  const firstPost = discussionState?.find((post) => post.depth === 0);
  const pinMutations = usePinMutation();
  const unpinMutation = useUnpinMutation();
  const pin = async () => {
    try {
      await pinMutations.mutateAsync({ community, username, permlink: tag });
    } catch (error) {
      handleError(error, { method: 'pin', params: { community, username, tag } });
    }
  };
  const unpin = async () => {
    try {
      await unpinMutation.mutateAsync({ community, username, permlink: tag });
    } catch (error) {
      handleError(error, { method: 'unpin', params: { community, username, tag } });
    }
  };
  //   const canonical_url =   new URL(entryData.url, env('SITE_DOMAIN')).href ;

  return (
    <>
      {/* <Head> <link rel="canonical" href={canonical_url} key="canonical" /> </Head> */}
      <div className="py-8">
        <div className="relative mx-auto my-0 max-w-4xl bg-background p-4">
          {communityData ? (
            <AlertDialogFlag
              community={community}
              username={username}
              permlink={tag}
              flagText={communityData.flag_text}
            >
              <Icons.flag className="absolute right-0 m-2 cursor-pointer hover:text-destructive" />
            </AlertDialogFlag>
          ) : null}

          <div>
            {!commentSite ? (
              <h1
                className="font-sanspro text-[21px] font-extrabold sm:text-[25.6px]"
                data-testid="article-title"
              >
                {entryData.title}
              </h1>
            ) : (
              <div className="flex flex-col gap-2 border-2 border-solid border-card-emptyBorder bg-card-noContent p-2">
                <h4 className="text-sm">
                  {t('post_content.if_comment.you_are_viewing_a_single_comments_thread_from')}:
                </h4>
                <h1 data-testid="article-title" className="text-2xl">
                  {entryData.title}
                </h1>
                <Link
                  className="text-sm hover:text-destructive"
                  href={`${postUrl}`}
                  data-testid="view-the-full-context"
                >
                  • {t('post_content.if_comment.view_the_full_context')}
                </Link>
                {discussionState && !discussionState.some((e) => e.depth === 1) ? (
                  <Link
                    className="text-sm hover:text-destructive"
                    href={`../../${parentUrl}`}
                    data-testid="view-the-direct-parent"
                  >
                    • {t('post_content.if_comment.view_the_direct_parent')}
                  </Link>
                ) : null}
              </div>
            )}
            <UserInfo
              permlink={tag}
              moderateEnabled={userCanModerate}
              author={entryData.author}
              author_reputation={entryData.author_reputation}
              author_title={entryData.author_title}
              authored={entryData.json_metadata?.author}
              community_title={communityData?.title || ''}
              community={community}
              category={entryData.category}
              created={entryData.created}
              blacklist={firstPost ? firstPost.blacklists : entryData.blacklists}
            />
            {/* {edit ? (
              <PostForm
                username={username}
                editMode={edit}
                setEditMode={setEdit}
                sideBySidePreview={false}
                post_s={post}
                refreshPage={refreshPage}
              />
            ) : legalBlockedUser ? (
              <div className="px-2 py-6">{t('global.unavailable_for_legal_reasons')}</div>
            ) : copyRightCheck || userFromDMCA ? (
              <div className="px-2 py-6">{t('post_content.body.copyright')}</div>
            ) : mutedPost ? (
              <>
                <Separator />
                <div className="my-8 flex items-center justify-between text-destructive">
                  {t('post_content.body.content_were_hidden')}
                  <Button variant="outlineRed" onClick={() => setMutedPost(false)}>
                    {t('post_content.body.show')}
                  </Button>
                </div>
              </>
            ) : (
              <ImageGallery>
                <RendererContainer
                  mainPost={post.depth === 0}
                  body={post.body}
                  author={post.author}
                  className={postClassName}
                />
              </ImageGallery>
            )} */}
            <Renderer mdSource={entryData.body} author={entryData.author} type="post" />

            <div className="clear-both">
              {!commentSite ? (
                <ul className="flex flex-wrap gap-2" data-testid="hashtags-post">
                  {entryData.json_metadata?.tags
                    ?.slice(entryData.community_title ? 0 : 1)
                    .map((tag: string) => (
                      <li key={tag}>
                        <Link
                          href={`/trending/${tag}`}
                          className="my-2 rounded-md border-[1px] border-border bg-background-secondary px-2 py-1 text-[14px] hover:border-[#788187]"
                        >
                          #{tag}
                        </Link>
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
            <div
              className="flex flex-col items-start text-sm text-primary sm:flex-row sm:justify-between"
              data-testid="author-data-post-footer"
            >
              <div className="my-4 flex flex-wrap gap-4">
                <div className="flex flex-wrap items-center">
                  <Clock className="h-4 w-4" />
                  <span className="px-1" title={String(parseDate(entryData.created))}>
                    {dateToFullRelative(entryData.created, t)}
                  </span>
                  {t('post_content.footer.in')}
                  <span className="px-1 text-destructive">
                    {entryData.community_title ? (
                      <Link
                        href={`/trending/${community}`}
                        className="hover:cursor-pointer"
                        data-testid="footer-comment-community-category-link"
                      >
                        {entryData.community_title}
                      </Link>
                    ) : (
                      <Link
                        href={`/trending/${entryData.category}`}
                        className="hover:cursor-pointer"
                        data-testid="footer-comment-community-category-link"
                      >
                        #{entryData.category}
                      </Link>
                    )}
                  </span>
                  {t('post_content.footer.by')}
                  {/* <div className="flex">
                    <UserPopoverCard
                      author={entryData.author}
                      author_reputation={entryData.author_reputation}
                      blacklist={firstPost ? firstPost.blacklists : entryData.blacklists}
                    />
                    {entryData.author_title ? (
                      <Badge variant="outline" className="border-destructive text-slate-500">
                        <span className="mr-1">{entryData.author_title}</span>
                        <ChangeTitleDialog
                          community={community}
                          moderateEnabled={userCanModerate}
                          userOnList={entryData.author}
                          title={entryData.author_title ?? ''}
                          permlink={tag}
                        />
                      </Badge>
                    ) : (
                      <ChangeTitleDialog
                        community={community}
                        moderateEnabled={userCanModerate}
                        userOnList={entryData.author}
                        title={entryData.author_title ?? ''}
                        permlink={tag}
                      />
                    )}
                  </div> */}
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  {/* <VotesComponent post={entryData} /> */}
                  {/* <DetailsCardHover
                    post={entryData}
                    decline={Number(entryData.max_accepted_payout.slice(0, 1)) === 0}
                    post_page
                  >
                    <span
                      data-testid="comment-payout"
                      className={`text-xs text-destructive hover:cursor-pointer sm:text-sm ${
                        Number(entryData.max_accepted_payout.slice(0, 1)) === 0
                          ? '!text-gray-600 line-through'
                          : ''
                      }`}
                    >
                      ${entryData.payout?.toFixed(2)}
                    </span>
                  </DetailsCardHover> */}
                  {/* {!isActiveVotesLoading && activeVotesData ? (
                    <DetailsCardVoters post={entryData}>
                      {post.stats?.total_votes && entryData.stats?.total_votes !== 0 ? (
                        <span className="text-xs text-destructive sm:text-sm">
                          {post.stats?.total_votes > 1
                            ? t('post_content.footer.votes', { votes: entryData.stats?.total_votes })
                            : t('post_content.footer.vote')}
                        </span>
                      ) : null}
                    </DetailsCardVoters>
                  ) : null} */}
                </div>
              </div>
              <div className="my-4 flex items-end gap-4 sm:flex-col">
                <div className="flex items-center" data-testid="comment-respons-header">
                  <ReblogTrigger
                    author={entryData.author}
                    permlink={entryData.permlink}
                    dataTestidTooltipContent="post-footer-reblog-tooltip"
                    dataTestidTooltipIcon="post-footer-reblog-icon"
                  />
                  <span className="mx-1">|</span>
                  {user && user.isLoggedIn ? (
                    <>
                      <button
                        onClick={() => {
                          setReply(!reply), removeBox();
                        }}
                        className="flex items-center text-destructive"
                        data-testid="comment-reply"
                      >
                        {t('post_content.footer.reply')}
                      </button>
                      {pinMutations.isLoading || unpinMutation.isLoading ? (
                        <div className="ml-2">
                          <CircleSpinner
                            loading={pinMutations.isLoading || unpinMutation.isLoading}
                            size={18}
                            color="#dc2626"
                          />
                        </div>
                      ) : userCanModerate && !commentSite ? (
                        <div className="flex flex-col items-center">
                          {/* <button
                            className="ml-2 flex items-center text-destructive"
                            onClick={post_is_pinned ? unpin : pin}
                            >
                            {post_is_pinned ? t('communities.unpin') : t('communities.pin')}
                          </button> */}
                          {/* TODO swap two button to one when api return stats.is_pinned, 
                            temprary use two button to unpin and pin
                            */}
                          <button className="ml-2 flex items-center text-destructive" onClick={pin}>
                            {t('communities.pin')}
                          </button>
                          <button className="ml-2 flex items-center text-destructive" onClick={unpin}>
                            {t('communities.unpin')}
                          </button>
                        </div>
                      ) : null}
                      {/* {userCanModerate ? (
                        <MutePostDialog
                          comment={false}
                          community={community}
                          username={entryData.author}
                          permlink={entryData.permlink}
                          contentMuted={entryData.stats?.gray ?? false}
                          discussionPermlink={entryData.permlink}
                          discussionAuthor={entryData.author}
                        />
                      ) : null} */}
                    </>
                  ) : (
                    <DialogLogin>
                      <button className="flex items-center text-destructive" data-testid="comment-reply">
                        {t('post_content.footer.reply')}
                      </button>
                    </DialogLogin>
                  )}
                  {user && user.isLoggedIn && entryData.author === user.username ? (
                    <>
                      <span className="mx-1">|</span>
                      <button
                        onClick={() => {
                          setEdit(!edit);
                        }}
                        className="flex items-center text-destructive"
                        data-testid="post-edit"
                      >
                        {t('post_content.footer.edit')}
                      </button>
                    </>
                  ) : null}
                  <span className="mx-1">|</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center" data-testid="comment-respons">
                        <Link href={entryData.url} className="flex cursor-pointer items-center">
                          {entryData.children > 1 ? (
                            <Icons.messagesSquare className="mr-1 h-4 w-4" />
                          ) : (
                            <Icons.comment className="mr-1 h-4 w-4" />
                          )}
                        </Link>
                        <Link href={entryData.url} className="text- flex cursor-pointer items-center">
                          {entryData.children}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent data-testid="post-footer-response-tooltip">
                        <p>
                          {entryData.children === 0
                            ? t('post_content.footer.no_responses')
                            : entryData.children === 1
                              ? t('post_content.footer.response')
                              : t('post_content.footer.responses', { responses: entryData.children })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    s
                  </TooltipProvider>
                </div>
                <div className="flex gap-2">
                  <FacebookShare url={entryData.url} />
                  <TwitterShare title={entryData.title} url={entryData.url} />
                  <LinkedInShare title={entryData.title} url={entryData.url} />
                  <RedditShare title={entryData.title} url={entryData.url} />
                  <SharePost path={entryData.url}>
                    <Link2 className="cursor-pointer hover:text-destructive" data-testid="share-post" />
                  </SharePost>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="comments" className="flex" />
        <div className="mx-auto max-w-4xl">
          {reply && user.isLoggedIn ? (
            <ReplyTextbox
              editMode={edit}
              onSetReply={setReply}
              username={entryData.author}
              permlink={tag}
              storageId={storageId}
              comment={storedComment}
            />
          ) : null}
        </div>
        {discussionIsLoading ? (
          <LoadingClient loading={discussionIsLoading} />
        ) : discussionState ? (
          <div className="mx-auto max-w-4xl pr-2">
            <div className="my-1 flex items-center justify-end" translate="no">
              <span className="pr-1">{t('select_sort.sort_comments.sort')}</span>
              <CommentSelectFilter />
            </div>
            {/* <DynamicComments
              highestAuthor={entryData.author}
              highestPermlink={entryData.permlink}
              permissionToMute={userCanModerate}
              mutedList={mutedListData}
              data={discussionState}
              flagText={communityData?.flag_text}
              parent={entryData}
              parent_depth={entryData.depth}
            /> */}
          </div>
        ) : null}
      </div>
    </>
  );
};

export default Content;
