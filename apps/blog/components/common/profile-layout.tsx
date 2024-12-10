'use client';

import React from 'react';
import Link from 'next/link';
import Loading from '@ui/components/loading';
import { useQuery } from '@tanstack/react-query';
import {
  getAccount,
  getDynamicGlobalProperties,
  getAccountFull,
  getAccountReputations
} from '@transaction/lib/hive';
import { delegatedHive, numberWithCommas, vestingHive } from '@hive/ui/lib/utils';
import { Separator } from '@hive/ui/components/separator';
import { Icons } from '@hive/ui/components/icons';
import { dateToFullRelative, dateToShow } from '@hive/ui/lib/parse-date';

import { getTwitterInfo } from '@transaction/lib/bridge';
import moment from 'moment';
import { TFunction } from 'i18next';
import { useFollowingInfiniteQuery } from '../hooks/use-following-infinitequery';
import { Avatar, AvatarFallback, AvatarImage } from '@ui/components';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import CustomError from '../custom-error';
import ButtonsContainer from '../buttons-container';
import clsx from 'clsx';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useTranslation } from '@/blog/i18n/client';
import { accountReputation } from '@/blog/lib/utils-app';
import { useParams } from 'next/navigation';
import { envData } from '@/blog/lib/env';
import { proxifyImageUrl } from '@ui/lib/old-profixy';

interface IProfileLayout {
  children: React.ReactNode;
}

function compareDates(dateStrings: string[], t: TFunction<'common_wallet', undefined>) {
  const dates = dateStrings.map((dateStr) => moment(dateStr));

  const today = moment();
  let closestDate = dates[0];
  let minDiff = Math.abs(today.diff(dates[0], 'days'));

  dates.forEach((date) => {
    const diff = Math.abs(date.diff(today, 'days'));
    if (diff < minDiff) {
      minDiff = diff;
      closestDate = date;
    }
  });

  const closestDateString = closestDate.format('YYYY-MM-DDTHH:mm:ss');
  return dateToFullRelative(closestDateString, t);
}

const ProfileLayout = ({ children }: IProfileLayout) => {
  const { user } = useUserClient();
  const { t } = useTranslation('common_blog');
  const { param: usernamet, param2 } = useParams() as { param: string; param2: string };
  const clean_username = usernamet.replace('%40', '');
  const path = `/@${clean_username}/${param2}`;
  const userFromGDPRList = gdprUserList.includes(clean_username);
  const { isLoading: profileDataIsLoading, data: profileData } = useQuery(
    ['profileData', clean_username],
    () => getAccountFull(clean_username),
    {
      enabled: !!clean_username
    }
  );
  const { isLoading: accountDataIsLoading, data: accountData } = useQuery(
    ['accountData', clean_username],
    () => getAccount(clean_username),
    {
      enabled: !!clean_username
    }
  );
  const mute = useFollowingInfiniteQuery(user.username, 50, 'ignore', ['ignore']);

  const { isLoading: dynamicGlobalDataIsLoading, data: dynamicGlobalData } = useQuery(
    ['dynamicGlobalData'],
    () => getDynamicGlobalProperties()
  );

  const { data: accountReputationData } = useQuery(
    ['accountReputationData', clean_username],
    () => getAccountReputations(clean_username, 1),
    {
      enabled: !!clean_username
    }
  );

  const { data: twitterData } = useQuery(
    ['twitterData', clean_username],
    () => getTwitterInfo(clean_username),
    {
      enabled: !!clean_username,
      retry: false,
      refetchOnWindowFocus: false
    }
  );
  const following = useFollowingInfiniteQuery(user.username, 1000, 'blog', ['blog']);

  if (accountDataIsLoading || dynamicGlobalDataIsLoading || profileDataIsLoading) {
    return <Loading loading={accountDataIsLoading || dynamicGlobalDataIsLoading || profileDataIsLoading} />;
  }
  if (!accountData || !dynamicGlobalData || !profileData) {
    return <p className="my-32 text-center text-3xl">Something went wrong</p>;
  }
  const delegated_hive = delegatedHive(accountData, dynamicGlobalData);
  const vesting_hive = vestingHive(accountData, dynamicGlobalData);
  const hp = vesting_hive.minus(delegated_hive);
  const legalBlockedUser = userIllegalContent.includes(clean_username);
  if (userFromGDPRList) {
    return <CustomError />;
  }
  return (
    <div>
      <div
        className=" w-full bg-gray-600 text-sm leading-6 sm:h-fit"
        style={{ textShadow: 'rgb(0, 0, 0) 1px 1px 2px' }}
        data-testid="profile-info"
      >
        {profileData ? (
          <div
            style={{
              backgroundImage:
                profileData?.posting_json_metadata &&
                JSON.parse(profileData?.posting_json_metadata).profile?.cover_image
                  ? `url('${proxifyImageUrl(
                      JSON.parse(profileData?.posting_json_metadata).profile?.cover_image,
                      '2048x512'
                    ).replace(/ /g, '%20')}')`
                  : '',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover'
            }}
            className="flex h-auto max-h-full min-h-full w-auto min-w-full max-w-full flex-col items-center text-white"
          >
            <div className="mt-4 flex items-center">
              <Avatar className="mr-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
                <AvatarImage
                  className="h-full w-full object-cover"
                  src={profileData?.profile?.profile_image}
                  alt="Profile picture"
                />
                <AvatarFallback>
                  <img
                    className="h-full w-full object-cover"
                    src="https://images.hive.blog/DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4"
                    alt="default img"
                  />
                </AvatarFallback>
              </Avatar>
              <h4 className="sm:text-2xl" data-testid="profile-name">
                <span className="font-semibold">
                  {profileData?.profile?.name ? profileData.profile.name : profileData.name}
                </span>{' '}
                <span
                  title={`This is ${clean_username}s's reputation score.\n\nThe reputation score is based on the history of votes received by the account, and is used to hide low quality content.`}
                >
                  (
                  {accountReputationData && accountReputationData[0].reputation
                    ? accountReputation(accountReputationData[0].reputation)
                    : accountReputation(profileData.reputation)}
                  )
                </span>
              </h4>
              {profileData.name ? (
                <Link
                  href={`https://hivebuzz.me/@${profileData.name}`}
                  target="_blank"
                  data-testid="profile-badge-link"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="fish image"
                    title={t('user_profile.hive_buzz_badge_title', { username: profileData.name })}
                    className="mx-2 w-6 duration-500 ease-in-out hover:w-12"
                    src={`https://hivebuzz.me/api/level/${profileData.name}?dead`}
                    data-testid="profile-badge-image"
                  />
                </Link>
              ) : null}
              {twitterData ? (
                <Link
                  href={twitterData.twitter_profile}
                  title={t('user_profile.twitter_badge_title')}
                  target="_blank"
                  data-testid="profile-twitter-badge"
                >
                  <Icons.twitter fill="#1da1f2" className="text-blue-400" />
                </Link>
              ) : null}
            </div>
            {!legalBlockedUser ? (
              <>
                <p className="my-1 max-w-[420px] text-center sm:my-4" data-testid="profile-about">
                  {profileData?.profile?.about
                    ? profileData?.profile?.about.slice(0, 157) +
                      (157 < profileData?.profile?.about.length ? '...' : '')
                    : null}
                </p>
                <ul className="my-1 flex h-5 gap-1 text-xs sm:text-sm" data-testid="profile-stats">
                  <li className="flex items-center gap-1">
                    <Link
                      href={`/@${profileData.name}/followers`}
                      className="hover:cursor-pointer hover:text-destructive hover:underline"
                    >
                      {profileData?.follow_stats?.follower_count === 0 || undefined
                        ? t('user_profile.lists.follower_count.zero')
                        : profileData?.follow_stats?.follower_count === 1
                          ? t('user_profile.lists.follower_count.one')
                          : t('user_profile.lists.follower_count.other', {
                              value: profileData?.follow_stats?.follower_count
                            })}
                    </Link>
                  </li>

                  <li
                    className="flex items-center
              gap-1"
                  >
                    <Separator orientation="vertical" className="bg-background" />
                    <Link
                      className="hover:cursor-pointer hover:text-destructive hover:underline"
                      href={`/@${profileData.name}`}
                    >
                      {profileData?.post_count === 0
                        ? t('user_profile.lists.post_count.zero')
                        : profileData?.post_count === 1
                          ? t('user_profile.lists.post_count.one')
                          : t('user_profile.lists.post_count.other', { value: profileData?.post_count })}
                    </Link>
                  </li>

                  <li
                    className="flex items-center
              gap-1"
                  >
                    <Separator orientation="vertical" className="bg-background" />{' '}
                    <Link
                      href={`/@${profileData.name}/followed`}
                      className="hover:cursor-pointer hover:text-destructive hover:underline"
                    >
                      {profileData?.follow_stats?.following_count === 0 || undefined
                        ? t('user_profile.lists.followed_count.zero')
                        : profileData?.follow_stats?.following_count === 1
                          ? t('user_profile.lists.followed_count.one')
                          : t('user_profile.lists.followed_count.other', {
                              value: profileData?.follow_stats?.following_count
                            })}
                    </Link>
                  </li>

                  <li className="flex items-center gap-1">
                    <Separator orientation="vertical" className="bg-background" />
                    {numberWithCommas(hp.toFixed(0)) + ' HP'}
                  </li>
                </ul>

                <ul className="my-1 flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
                  <li className="flex items-center gap-1">
                    <Link
                      href={`/@${profileData?.name}/lists/blacklisted`}
                      className="hover:cursor-pointer hover:text-destructive hover:underline"
                    >
                      {t('user_profile.lists.blacklisted_users')}
                    </Link>
                  </li>

                  <li className="flex items-center gap-1">
                    <Separator orientation="vertical" className="h-4 bg-background" />
                    <Link
                      href={`/@${profileData?.name}/lists/muted`}
                      className="hover:cursor-pointer hover:text-destructive hover:underline"
                    >
                      {t('user_profile.lists.muted_users')}
                    </Link>
                  </li>

                  <li className="flex items-center gap-1">
                    <Separator orientation="vertical" className="h-4 bg-background" />
                    <Link
                      href={`/@${profileData?.name}/lists/followed_blacklists`}
                      className="hover:cursor-pointer hover:text-destructive hover:underline"
                    >
                      {t('user_profile.lists.followed_blacklists')}
                    </Link>
                  </li>

                  <li className="flex items-center gap-1">
                    <Separator orientation="vertical" className="bg-background" />
                    <Link
                      href={`/@${profileData?.name}/lists/followed_muted_lists`}
                      className="hover:cursor-pointer hover:text-destructive hover:underline"
                    >
                      {t('user_profile.lists.followed_muted_lists')}
                    </Link>
                  </li>
                </ul>

                <ul className="my-4 flex h-auto flex-wrap justify-center gap-1 text-xs sm:gap-4 sm:text-sm">
                  {profileData?.profile?.location ? (
                    <li className="flex items-center">
                      <Icons.mapPin className="m-1" />
                      <span data-testid="user-location">{profileData?.profile?.location}</span>
                    </li>
                  ) : null}
                  {profileData?.profile?.website ? (
                    <li className="flex items-center">
                      <Icons.globe2 className="m-1" />
                      <Link
                        target="_external"
                        className="website-link break-words "
                        href={`https://${profileData?.profile?.website?.replace(/^(https?|ftp):\/\//, '')}`}
                      >
                        <span>{profileData?.profile?.website}</span>
                      </Link>
                    </li>
                  ) : null}
                  <li className="flex items-center">
                    <Icons.calendarHeart className="m-1" />
                    <span data-testid="user-joined">
                      {t('user_profile.joined')}{' '}
                      {profileData?.created ? dateToShow(profileData.created, t) : null}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <Icons.calendarActive className="m-1" />
                    <span data-testid="user-last-time-active">
                      {t('user_profile.active')}{' '}
                      {compareDates(
                        [profileData.created, profileData.last_vote_time, profileData.last_post],
                        t
                      )}
                    </span>
                  </li>
                </ul>
                {user.username !== clean_username ? (
                  <div className="m-2 flex gap-2 hover:text-destructive sm:absolute sm:right-0">
                    <ButtonsContainer
                      username={clean_username}
                      user={user}
                      variant="default"
                      follow={following}
                      mute={mute}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="p-10">{t('global.unavailable_for_legal_reasons')}</div>
            )}
          </div>
        ) : (
          <div className={`h-auto max-h-full min-h-full w-auto min-w-full max-w-full bg-gray-600 bg-cover`} />
        )}
      </div>
      <div className="flex flex-col pb-8 md:pb-4 ">
        <div className="w-full">
          <div className="flex bg-gray-700" data-testid="profile-navigation">
            <div className="container mx-auto flex max-w-screen-xl justify-between p-0 text-white sm:pl-8">
              <ul className="flex h-full flex-wrap gap-x-2 text-xs sm:text-base lg:flex lg:gap-8">
                <ListItem
                  href={`/@${clean_username}`}
                  currentTab={path === `/@${clean_username}`}
                  label={t('navigation.profile_navbar.blog')}
                />
                <ListItem
                  href={`/@${clean_username}/posts`}
                  currentTab={
                    path === `/@${clean_username}/posts` ||
                    path === `/@${clean_username}/comments` ||
                    path === `/@${clean_username}/payout`
                  }
                  label={t('navigation.profile_navbar.posts')}
                />
                <ListItem
                  href={`/@${clean_username}/replies`}
                  currentTab={path === `/@${clean_username}/replies`}
                  label={t('navigation.profile_navbar.replies')}
                />
                <ListItem
                  href={`/@${clean_username}/communities`}
                  currentTab={path === `/@${clean_username}/communities`}
                  label={t('navigation.profile_navbar.social')}
                />
                <ListItem
                  href={`/@${clean_username}/notifications`}
                  currentTab={path === `/@${clean_username}/notifications`}
                  label={t('navigation.profile_navbar.notifications')}
                />
              </ul>
              <ul className="flex h-full flex-nowrap text-xs sm:text-base lg:flex lg:gap-4">
                <li>
                  <Link
                    href={`${envData.NEXT_PUBLIC_WALLET_DOMAIN}/@${clean_username}/transfers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-4 flex h-12 items-center px-2 hover:bg-background hover:text-primary"
                  >
                    {t('navigation.profile_navbar.wallet')}
                  </Link>
                </li>
                {user.isLoggedIn && clean_username === user.username ? (
                  <li>
                    <Link
                      href={`/@${clean_username}/settings`}
                      rel="noopener noreferrer"
                      className={`flex h-12 items-center px-2 hover:bg-background hover:text-primary ${
                        path === `/@${clean_username}/settings`
                          ? 'bg-background text-primary dark:hover:text-slate-200'
                          : ''
                      }`}
                    >
                      {t('navigation.profile_navbar.settings')}
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
        <main className="container mx-auto max-w-screen-xl pt-4">{children}</main>
      </div>
    </div>
  );
};

export default ProfileLayout;

const ListItem = ({ href, currentTab, label }: { href: string; currentTab: boolean; label: string }) => {
  return (
    <li>
      <Link
        href={href}
        className={clsx('flex h-12 items-center px-2 hover:bg-background hover:text-primary', {
          'bg-background text-primary dark:hover:text-slate-200': currentTab
        })}
      >
        {label}
      </Link>
    </li>
  );
};
