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
import { handleError } from '@ui/lib/utils';
import { Skeleton } from '@ui/components';
import { ImpulseSpinner } from 'react-spinners-kit';

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

  const muteMutation = useMuteMutation();
  const followMutedBlogMutation = useFollowMutedBlogMutation();
  const followBlacklistBlogMutation = useFollowBlacklistBlogMutation();
  const blacklistBlogMutation = useBlacklistBlogMutation();

  const unfollowBlacklistBlogMutation = useUnfollowBlacklistBlogMutation();
  const unblacklistBlogMutation = useUnblacklistBlogMutation();
  const unfollowMutedBlogMutation = useUnfollowMutedBlogMutation();
  const unmuteMutation = useUnmuteMutation();

  const resetBlogListMutation = useResetBlogListMutation();
  const resetBlacklistBlogMutation = useResetBlacklistBlogMutation();
  const resetFollowBlacklistBlogMutation = useResetFollowBlacklistBlogMutation();
  const resetFollowMutedBlogMutation = useResetFollowMutedBlogMutation();

  const deleteFromList = useCallback(
    async (username: string, variant: 'blacklisted' | 'muted' | 'followedBlacklist' | 'followedMute') => {
      switch (variant) {
        case 'blacklisted': {
          try {
            await unblacklistBlogMutation.mutateAsync({ blog: username });
          } catch (error) {
            handleError(error, { method: 'unblacklistBlog', params: { blog: username } });
          }
          break;
        }
        case 'muted': {
          try {
            await unmuteMutation.mutateAsync({ username });
          } catch (error) {
            handleError(error, { method: 'unmute', params: { username } });
          }
          break;
        }
        case 'followedBlacklist': {
          try {
            await unfollowBlacklistBlogMutation.mutateAsync({ blog: username });
          } catch (error) {
            handleError(error, { method: 'unfollowBlacklistBlog', params: { blog: username } });
          }
          break;
        }
        case 'followedMute': {
          try {
            await unfollowMutedBlogMutation.mutateAsync({ blog: username });
          } catch (error) {
            handleError(error, { method: 'unfollowMutedBlog', params: { blog: username } });
          }
          break;
        }
      }
    },
    [unblacklistBlogMutation, unfollowBlacklistBlogMutation, unfollowMutedBlogMutation, unmuteMutation]
  );

  const addToList = useCallback(
    async (usernames: string, variant: 'blacklisted' | 'muted' | 'followedBlacklist' | 'followedMute') => {
      switch (variant) {
        case 'blacklisted': {
          try {
            await blacklistBlogMutation.mutateAsync({ otherBlogs: usernames });
          } catch (error) {
            handleError(error, { method: 'blacklistBlog', params: { otherBlogs: usernames } });
          }
          break;
        }
        case 'muted': {
          try {
            await muteMutation.mutateAsync({ username: usernames });
          } catch (error) {
            handleError(error, { method: 'mute', params: { username: usernames } });
          }
          break;
        }
        case 'followedBlacklist': {
          try {
            await followBlacklistBlogMutation.mutateAsync({ otherBlogs: usernames });
          } catch (error) {
            handleError(error, { method: 'followBlacklistBlog', params: { otherBlogs: usernames } });
          }
          break;
        }
        case 'followedMute': {
          try {
            await followMutedBlogMutation.mutateAsync({ otherBlogs: usernames });
          } catch (error) {
            handleError(error, { method: 'followMutedBlog', params: { otherBlogs: usernames } });
          }
          break;
        }
      }
    },
    [blacklistBlogMutation, followBlacklistBlogMutation, followMutedBlogMutation, muteMutation]
  );

  const resetList = useCallback(
    async (variant: 'blacklisted' | 'muted' | 'followedBlacklist' | 'followedMute') => {
      switch (variant) {
        case 'blacklisted': {
          try {
            await resetBlacklistBlogMutation.mutateAsync();
          } catch (error) {
            handleError(error, { method: 'resetBlacklistBlog', params: {} });
          }
          break;
        }
        case 'muted': {
          try {
            await resetBlogListMutation.mutateAsync();
          } catch (error) {
            handleError(error, { method: 'resetBlogList', params: {} });
          }
          break;
        }
        case 'followedBlacklist': {
          try {
            await resetFollowBlacklistBlogMutation.mutateAsync();
          } catch (error) {
            handleError(error, { method: 'resetFollowBlacklistBlog', params: {} });
          }
          break;
        }
        case 'followedMute': {
          try {
            await resetFollowMutedBlogMutation.mutateAsync();
          } catch (error) {
            handleError(error, { method: 'resetFollowmutedBlog', params: {} });
          }
          break;
        }
      }
    },
    [
      resetBlacklistBlogMutation,
      resetBlogListMutation,
      resetFollowBlacklistBlogMutation,
      resetFollowMutedBlogMutation
    ]
  );
  const item_is_loading =
    blacklistBlogMutation.isLoading ||
    muteMutation.isLoading ||
    followBlacklistBlogMutation.isLoading ||
    followMutedBlogMutation.isLoading;

  return (
    <ProfileLayout>
      <div className="flex  flex-col items-center gap-4 p-4">
        <Accordion type="single" collapsible className="w-1/3 text-center">
          <AccordionItem value="item-1">
            <AccordionTrigger className="justify-center text-center text-xl ">
              {t('user_profile.lists.list.what_is_this')}
            </AccordionTrigger>
            <AccordionContent>
              {t('user_profile.lists.list.show_or_hide_descripton_one')}
              <Link href={`/@/settings`} className="text-red-600">
                {t('user_profile.lists.list.settings')}
              </Link>
              {t('user_profile.lists.list.show_or_hide_descripton_two')}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <h1 className="text-xl font-bold">
          {variant === 'blacklisted'
            ? t('user_profile.lists.list.accounts_blacklisted_by', { username: username })
            : variant === 'muted'
              ? t('user_profile.lists.list.accounts_muted_by', { username: username })
              : variant === 'followedBlacklist'
                ? t('user_profile.lists.followed_blacklists')
                : variant === 'followedMute'
                  ? t('user_profile.lists.followed_muted_lists')
                  : null}
        </h1>
        <p
          className={clsx('text-center text-xs', {
            hidden: variant === 'followedBlacklist' || variant === 'followedMute'
          })}
        >
          {t('user_profile.lists.list.list_description')}
          {variant === 'blacklisted' && profilData?.profile?.blacklist_description
            ? profilData?.profile?.blacklist_description
            : variant === 'muted' && profilData?.profile?.muted_list_description
              ? profilData?.profile?.muted_list_description
              : t('user_profile.lists.list.description_not_added')}
        </p>
        <ul className="flex flex-col ">
          {data && data.length === 0 && !item_is_loading ? (
            <li className="bg-slate-200 p-4 text-center text-sm font-bold dark:bg-slate-900 ">
              {t('user_profile.lists.list.empty_list')}
            </li>
          ) : splitArrays.length > 0 ? (
            splitArrays[page].map((e: IFollowList) => {
              const delete_is_loading =
                (unfollowBlacklistBlogMutation.isLoading &&
                  unfollowBlacklistBlogMutation.variables?.blog === e.name) ||
                (unfollowMutedBlogMutation.isLoading &&
                  unfollowMutedBlogMutation.variables?.blog === e.name) ||
                (unmuteMutation.isLoading && unmuteMutation.variables?.username === e.name) ||
                (unblacklistBlogMutation.isLoading && unblacklistBlogMutation.variables?.blog === e.name);
              return (
                <li
                  key={e.name}
                  className="flex w-72 items-center justify-between p-1 font-semibold odd:bg-slate-200 even:bg-slate-100 dark:odd:bg-slate-800 dark:even:bg-slate-900"
                >
                  <span className="px-2">
                    <Link className="text-red-600" href={`/@${e.name}`}>
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
                      disabled={delete_is_loading}
                    >
                      {delete_is_loading ? (
                        <ImpulseSpinner size={70} frontColor="#dc2626" />
                      ) : variant === 'blacklisted' ? (
                        t('user_profile.lists.list.unblacklist')
                      ) : variant === 'muted' ? (
                        t('user_profile.lists.list.unmute')
                      ) : variant === 'followedBlacklist' ? (
                        t('user_profile.lists.list.unfollow_blacklist')
                      ) : variant === 'followedMute' ? (
                        t('user_profile.lists.list.unfollow_muted_list')
                      ) : null}
                    </Button>
                  ) : null}
                </li>
              );
            })
          ) : null}
          {item_is_loading ? (
            <li className="flex h-9 w-full items-center justify-between bg-slate-200 pl-2 pr-1 dark:bg-slate-900">
              <Skeleton className="h-5 w-24 bg-slate-50 dark:bg-slate-700" />
              <Skeleton className="h-6 w-20 bg-slate-50 dark:bg-slate-700" />
            </li>
          ) : null}
        </ul>
        {splitArrays.length > 1 ? (
          <div className="flex gap-2">
            <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(0)}>
              {t('user_profile.lists.list.first_button')}
            </Button>{' '}
            <Button variant="outlineRed" disabled={page === 0} size="sm" onClick={() => setPage(page - 1)}>
              {t('user_profile.lists.list.previous_button')}
            </Button>
            <Button
              variant="outlineRed"
              disabled={page === splitArrays.length - 1}
              size="sm"
              onClick={() => setPage(page + 1)}
            >
              {t('user_profile.lists.list.next_button')}
            </Button>
            <Button
              variant="outlineRed"
              disabled={page === splitArrays.length - 1}
              size="sm"
              onClick={() => setPage(splitArrays.length - 1)}
            >
              {t('user_profile.lists.list.last_button')}
            </Button>
          </div>
        ) : null}
        {splitArrays.length > 1 ? (
          <div className="text-sm">
            {t('user_profile.lists.list.viewing_page', { current: page + 1, total: splitArrays.length })}
          </div>
        ) : null}
        {data && data.length > 0 ? <div className="text-sm"></div> : null}
        {userOwner ? (
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold">{t('user_profile.lists.list.add_account_to_list')}</h1>
            <span className="text-sm">{t('user_profile.lists.list.single_account')}</span>
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
                disabled={item_is_loading}
                onClick={() => {
                  addToList(addValue, variant), setAddValue('');
                }}
              >
                {t('user_profile.lists.list.add_to_list')}
              </Button>
            ) : null}
          </div>
        ) : null}
        <h1 className="text-xl font-bold">{t('user_profile.lists.list.search_this_list')}</h1>
        <div className="flex  justify-center bg-slate-200 p-2 dark:bg-slate-900 sm:w-1/3">
          <Input onChange={(e) => onSearchChange(e.target.value)} className="bg-white sm:w-3/4" />
        </div>
        {userOwner ? (
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xl font-bold">{t('user_profile.lists.list.reset_options')}</h1>
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
                  ? t('user_profile.lists.list.reset_blacklist')
                  : variant === 'muted'
                    ? t('user_profile.lists.list.reset_muted_list')
                    : variant === 'followedBlacklist'
                      ? t('user_profile.lists.list.reset_followed_blacklists')
                      : variant === 'followedMute'
                        ? t('user_profile.lists.list.reset_followed_muted_list')
                        : null}
              </Button>
              <Button onClick={() => transactionService.resetAllBlog()} size="sm" className="text-xs">
                {t('user_profile.lists.list.reset_all_lists')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </ProfileLayout>
  );
}
