import ProfileLayout from '@/blog/components/common/profile-layout';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/components/accordion';
import clsx from 'clsx';
import { IFollowList } from '@transaction/lib/bridge';
import { useCallback, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { transactionService } from '@transaction/index';
import { getAccountFull } from '@transaction/lib/hive';
import { useQuery } from '@tanstack/react-query';
import { useBlacklistBlogMutation, useUnblacklistBlogMutation } from './hooks/use-blacklist-mutations';
import { useMuteMutation, useUnmuteMutation } from './hooks/use-mute-mutations';
import {
  useFollowBlacklistBlogMutation,
  useFollowMutedBlogMutation,
  useUnfollowBlacklistBlogMutation,
  useUnfollowMutedBlogMutation
} from './hooks/use-follow-mutations';
import {
  useResetBlacklistBlogMutation,
  useResetBlogListMutation,
  useResetFollowBlacklistBlogMutation,
  useResetFollowMutedBlogMutation
} from './hooks/use-reset-mutations';

export default function ProfileLists({
  username,
  variant,
  data
}: {
  username: string;
  variant: 'blacklisted' | 'muted' | 'followedBlacklist' | 'followedMute';
  data: IFollowList[] | undefined;
}) {
  const { user } = useUser();
  const {
    isLoading: isLoadingData,
    error: errorData,
    data: profilData
  } = useQuery(['profileData', user.username], () => getAccountFull(username));
  const { t } = useTranslation('common_blog');
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [addValue, setAddValue] = useState('');
  const splitArrays = [];
  const chunkSize = 10;
  const userOwner = user.username === username && user.isLoggedIn;
  const filteredNames = data
    ?.filter((e) => e.name !== 'null')
    .filter((value: IFollowList) => {
      const searchWord = filter.toLowerCase();
      const userName = value.name.toLowerCase();
      if (userName.includes(searchWord)) {
        return true;
      }
      return false;
    });

  const onSearchChange = (e: string) => {
    setFilter(e);
  };

  if (data && filteredNames && data.length > 0) {
    for (let i = 0; i < filteredNames.length; i += chunkSize) {
      const chunk = filteredNames.slice(i, i + chunkSize);
      splitArrays.push(chunk);
    }
  }

  const { blacklistBlog } = useBlacklistBlogMutation();
  const { unblacklistBlog } = useUnblacklistBlogMutation();
  const { mute } = useMuteMutation();
  const { unmute } = useUnmuteMutation();
  const { followBlacklistBlog } = useFollowBlacklistBlogMutation();
  const { unfollowBlacklistBlog } = useUnfollowBlacklistBlogMutation();
  const { unfollowMutedBlog } = useUnfollowMutedBlogMutation();
  const { followMutedBlog } = useFollowMutedBlogMutation();
  const { resetBlogList } = useResetBlogListMutation();
  const { resetBlacklistBlog } = useResetBlacklistBlogMutation();
  const { resetFollowBlacklistBlog } = useResetFollowBlacklistBlogMutation();
  const { resetFollowMutedBlog } = useResetFollowMutedBlogMutation();

  const deleteFromList = useCallback(
    (username: string, variant: 'blacklisted' | 'muted' | 'followedBlacklist' | 'followedMute') => {
      switch (variant) {
        case 'blacklisted': {
          unblacklistBlog({ blog: username });
          break;
        }
        case 'muted': {
          unmute({ username });
          break;
        }
        case 'followedBlacklist': {
          unfollowBlacklistBlog({ blog: username });
          break;
        }
        case 'followedMute': {
          unfollowMutedBlog({ blog: username });
          break;
        }
      }
    },
    [unblacklistBlog, unfollowBlacklistBlog, unfollowMutedBlog, unmute]
  );

  const addToList = useCallback(
    (usernames: string, variant: 'blacklisted' | 'muted' | 'followedBlacklist' | 'followedMute') => {
      switch (variant) {
        case 'blacklisted': {
          blacklistBlog({ otherBlogs: usernames });
          break;
        }
        case 'muted': {
          mute({ username: usernames });
          break;
        }
        case 'followedBlacklist': {
          followBlacklistBlog({ otherBlogs: usernames });
          break;
        }
        case 'followedMute': {
          followMutedBlog({ otherBlogs: usernames });
          break;
        }
      }
    },
    [blacklistBlog, followBlacklistBlog, followMutedBlog, mute]
  );

  const resetList = useCallback(
    (variant: 'blacklisted' | 'muted' | 'followedBlacklist' | 'followedMute') => {
      switch (variant) {
        case 'blacklisted': {
          resetBlacklistBlog();
          break;
        }
        case 'muted': {
          resetBlogList();
          break;
        }
        case 'followedBlacklist': {
          resetFollowBlacklistBlog();
          break;
        }
        case 'followedMute': {
          resetFollowMutedBlog();
          break;
        }
      }
    },
    [resetBlacklistBlog, resetBlogList, resetFollowBlacklistBlog, resetFollowMutedBlog]
  );

  return (
    <ProfileLayout>
      <div className="flex  flex-col items-center gap-4 p-4">
        <Accordion type="single" collapsible className="w-1/3 text-center">
          <AccordionItem value="item-1">
            <AccordionTrigger className="justify-center text-center text-xl ">
              {t('user_profil.lists.list.what_is_this')}
            </AccordionTrigger>
            <AccordionContent>
              {t('user_profil.lists.list.show_or_hide_descripton_one')}
              <Link href={`/@/settings`} className="text-red-600">
                {t('user_profil.lists.list.settings')}
              </Link>
              {t('user_profil.lists.list.show_or_hide_descripton_two')}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <h1 className="text-xl font-bold">
          {variant === 'blacklisted'
            ? t('user_profil.lists.list.accounts_blacklisted_by', { username: username })
            : variant === 'muted'
              ? t('user_profil.lists.list.accounts_muted_by', { username: username })
              : variant === 'followedBlacklist'
                ? t('user_profil.lists.followed_blacklists')
                : variant === 'followedMute'
                  ? t('user_profil.lists.followed_muted_lists')
                  : null}
        </h1>
        <p
          className={clsx('text-center text-xs', {
            hidden: variant === 'followedBlacklist' || variant === 'followedMute'
          })}
        >
          {t('user_profil.lists.list.list_description')}
          {variant === 'blacklisted' && profilData?.profile?.blacklist_description
            ? profilData?.profile?.blacklist_description
            : variant === 'muted' && profilData?.profile?.muted_list_description
              ? profilData?.profile?.muted_list_description
              : t('user_profil.lists.list.description_not_added')}
        </p>
        <ul className="flex flex-col ">
          {data && data.length === 0 ? (
            <li className="bg-slate-200 p-4 text-center text-sm font-bold dark:bg-slate-900 ">
              {t('user_profil.lists.list.empty_list')}
            </li>
          ) : splitArrays.length > 0 ? (
            splitArrays[page].map((e: IFollowList) => (
              <li
                key={e.name}
                className="flex w-full items-center justify-between p-1 font-semibold odd:bg-slate-200 even:bg-slate-100 dark:odd:bg-slate-800 dark:even:bg-slate-900"
              >
                <span className="px-2">
                  <Link className="text-red-600 " href={`/@${e.name}`}>
                    {e.name}
                  </Link>
                  {' ' + e.blacklist_description}
                </span>
                {userOwner ? (
                  <Button
                    variant="outlineRed"
                    className="whitespace-nowrap p-1"
                    size="xs"
                    onClick={() => {
                      deleteFromList(e.name, variant);
                    }}
                  >
                    {variant === 'blacklisted'
                      ? t('user_profil.lists.list.unblacklist')
                      : variant === 'muted'
                        ? t('user_profil.lists.list.unmute')
                        : variant === 'followedBlacklist'
                          ? t('user_profil.lists.list.unfollow_blacklist')
                          : variant === 'followedMute'
                            ? t('user_profil.lists.list.unfollow_muted_list')
                            : null}
                  </Button>
                ) : null}
              </li>
            ))
          ) : null}
        </ul>
        {splitArrays.length > 1 ? (
          <div className="flex gap-2">
            <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(0)}>
              {t('user_profil.lists.list.first_button')}
            </Button>{' '}
            <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(page - 1)}>
              {t('user_profil.lists.list.previous_button')}
            </Button>
            <Button
              variant="outlineRed"
              disabled={page === splitArrays.length - 1}
              size="sm"
              onClick={() => setPage(page + 1)}
            >
              {t('user_profil.lists.list.next_button')}
            </Button>
            <Button
              variant="outlineRed"
              disabled={page === splitArrays.length - 1}
              size="sm"
              onClick={() => setPage(splitArrays.length - 1)}
            >
              {t('user_profil.lists.list.last_button')}
            </Button>
          </div>
        ) : null}
        {splitArrays.length > 1 ? (
          <div className="text-sm">
            {t('user_profil.lists.list.viewing_page', { current: page + 1, total: splitArrays.length })}
          </div>
        ) : null}
        {data && data.length > 0 ? <div className="text-sm"></div> : null}
        {userOwner ? (
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold">{t('user_profil.lists.list.add_account_to_list')}</h1>
            <span className="text-sm">{t('user_profil.lists.list.single_account')}</span>
            <div className="flex w-full justify-center bg-slate-200 p-2 dark:bg-slate-900">
              <Input
                className="bg-white sm:w-3/4"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
              />
            </div>
            {addValue ? (
              <Button
                className="mt-2"
                onClick={() => {
                  addToList(addValue, variant), setAddValue('');
                }}
              >
                {t('user_profil.lists.list.add_to_list')}
              </Button>
            ) : null}
          </div>
        ) : null}
        <h1 className="text-xl font-bold">{t('user_profil.lists.list.search_this_list')}</h1>
        <div className="flex  justify-center bg-slate-200 p-2 dark:bg-slate-900 sm:w-1/3">
          <Input onChange={(e) => onSearchChange(e.target.value)} className="bg-white sm:w-3/4" />
        </div>
        {userOwner ? (
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xl font-bold">{t('user_profil.lists.list.reset_options')}</h1>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  resetList(variant);
                }}
                size="sm"
                variant="outlineRed"
                className="text-xs"
              >
                {variant === 'blacklisted'
                  ? t('user_profil.lists.list.reset_blacklist')
                  : variant === 'muted'
                    ? t('user_profil.lists.list.reset_muted_list')
                    : variant === 'followedBlacklist'
                      ? t('user_profil.lists.list.reset_followed_blacklists')
                      : variant === 'followedMute'
                        ? t('user_profil.lists.list.reset_followed_muted_list')
                        : null}
              </Button>
              <Button onClick={() => transactionService.resetAllBlog()} size="sm" className="text-xs">
                {t('user_profil.lists.list.reset_all_lists')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </ProfileLayout>
  );
}
