'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { Link } from '@hive/ui';
import clsx from 'clsx';
import BasePathLink from '@/blog/components/base-path-link';
import { useQuery } from '@tanstack/react-query';
import env from '@beam-australia/react-env';

import { useTranslation } from '@/blog/i18n/client';
import { Avatar, AvatarFallback, AvatarImage, proxifyImageSrc, getUserAvatarUrl, escapeCssUrl, isSafeImageUrl, isSafeExternalUrl } from '@ui/components';
import { Separator } from '@hive/ui/components/separator';
import TimeAgo from '@ui/components/time-ago';
import { Icons } from '@hive/ui/components/icons';
import { dateToShow } from '@ui/lib/parse-date';
import { convertToHP, numberWithCommas } from '@ui/lib/utils';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import { convertStringToBig } from '@ui/lib/helpers';

import { accountReputation, compareDates } from '@/blog/lib/utils';
import CustomError from '@/blog/components/custom-error';
import { getAccountFull, getAccountReputations, getDynamicGlobalProperties } from '@transaction/lib/hive-api';

import ButtonsContainer from '@/blog/features/mute-follow/buttons-container';
import { notFound, usePathname } from 'next/navigation';
import { useFollowingInfiniteQuery } from '@/blog/features/account-lists/hooks/use-following-infinitequery';
import { getTwitterInfo } from '@transaction/lib/custom-api';
import ListItem from './list-item';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const getCoverImageStyle = (profileData: { posting_json_metadata?: string } | null): string => {
  try {
    if (!profileData?.posting_json_metadata) return '';
    const metadata = JSON.parse(profileData.posting_json_metadata);
    const coverImage = metadata?.profile?.cover_image;

    if (!coverImage || !isSafeImageUrl(coverImage)) return '';

    const proxifiedUrl = proxifyImageSrc(coverImage, 2048, 512);
    return `url('${escapeCssUrl(proxifiedUrl.replace(/ /g, '%20'))}')`;
  } catch {
    return '';
  }
};

const ProfileLayout = ({ children }: { children: ReactNode }) => {
  const { user } = useUserClient();
  const { t } = useTranslation('common_blog');
  const pathname = usePathname();
  const username = pathname?.split('/')[1].replace('@', '') ?? '';
  const currentTab = pathname?.split('/')[2] ?? 'blog';
  const walletHost = env('WALLET_ENDPOINT');
  const explorerHost = env('EXPLORER_DOMAIN');
  const userFromGDPRList = gdprUserList.includes(username);

  const { data: profileData } = useQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username),
    enabled: !!username
  });

  const mute = useFollowingInfiniteQuery(user.username, 1000, 'ignore', ['ignore']);
  const following = useFollowingInfiniteQuery(user.username, 1000, 'blog', ['blog']);

  const { data: accountReputationData } = useQuery({
    queryKey: ['accountReputationData', username],
    queryFn: () => getAccountReputations(username, 1),
    enabled: !!username
  });

  const { data: twitterData } = useQuery({
    queryKey: ['twitterData', username],
    queryFn: () => getTwitterInfo(username),
    enabled: !!username,
    retry: false,
    refetchOnWindowFocus: false
  });
  const { data: dynamicGlobalData } = useQuery({
    queryKey: ['dynamicGlobalData'],
    queryFn: () => getDynamicGlobalProperties()
  });

  if (
    !dynamicGlobalData ||
    !profileData ||
    !profileData.delegated_vesting_shares ||
    !profileData.received_vesting_shares ||
    !profileData.vesting_shares
  ) {
    return notFound();
  }

  const delegated_hive = convertToHP(
    convertStringToBig(profileData.delegated_vesting_shares).minus(
      convertStringToBig(profileData.received_vesting_shares)
    ),
    dynamicGlobalData.total_vesting_shares,
    dynamicGlobalData.total_vesting_fund_hive
  );
  const vesting_hive = convertToHP(
    convertStringToBig(profileData.vesting_shares),
    dynamicGlobalData.total_vesting_shares,
    dynamicGlobalData.total_vesting_fund_hive
  );
  const hp = vesting_hive.minus(delegated_hive);

  const legalBlockedUser = userIllegalContent.includes(username);
  if (userFromGDPRList) {
    return <CustomError />;
  }
  return (
    <div>
      <div
        className={clsx('w-full bg-gray-600 text-sm leading-6 sm:h-fit', {
          'animate-pulse': profileData._temporary
        })}
        style={{ textShadow: 'rgb(0, 0, 0) 1px 1px 2px' }}
        data-testid="profile-info"
      >
        <div
          style={{
            backgroundImage: getCoverImageStyle(profileData),
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
                src={getUserAvatarUrl(profileData?.name || '', 'medium')}
                alt="Profile picture"
              />
              <AvatarFallback>
                <img
                  className="h-full w-full object-cover"
                  src={getUserAvatarUrl(profileData?.name || '', 'medium')}
                  alt="Profile picture"
                />
              </AvatarFallback>
            </Avatar>
            <h4 className="sm:text-2xl" data-testid="profile-name">
              <span className="font-semibold">
                {profileData?.profile?.name ? profileData.profile.name : profileData.name}
              </span>{' '}
              <span
                title={`This is ${username}s's reputation score.\n\nThe reputation score is based on the history of votes received by the account, and is used to hide low quality content.`}
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
            {twitterData && isSafeExternalUrl(twitterData.twitter_profile) ? (
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
                  <BasePathLink
                    href={`/@${profileData?.name}/lists/blacklisted`}
                    className="hover:cursor-pointer hover:text-destructive hover:underline"
                  >
                    {t('user_profile.lists.blacklisted_users')}
                  </BasePathLink>
                </li>

                <li className="flex items-center gap-1">
                  <Separator orientation="vertical" className="h-4 bg-background" />
                  <BasePathLink
                    href={`/@${profileData?.name}/lists/muted`}
                    className="hover:cursor-pointer hover:text-destructive hover:underline"
                  >
                    {t('user_profile.lists.muted_users')}
                  </BasePathLink>
                </li>

                <li className="flex items-center gap-1">
                  <Separator orientation="vertical" className="h-4 bg-background" />
                  <BasePathLink
                    href={`/@${profileData?.name}/lists/followed_blacklists`}
                    className="hover:cursor-pointer hover:text-destructive hover:underline"
                  >
                    {t('user_profile.lists.followed_blacklists')}
                  </BasePathLink>
                </li>

                <li className="flex items-center gap-1">
                  <Separator orientation="vertical" className="bg-background" />
                  <BasePathLink
                    href={`/@${profileData?.name}/lists/followed_muted_lists`}
                    className="hover:cursor-pointer hover:text-destructive hover:underline"
                  >
                    {t('user_profile.lists.followed_muted_lists')}
                  </BasePathLink>
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
                    <TimeAgo
                      date={compareDates([
                        profileData.created,
                        profileData.last_vote_time,
                        profileData.last_post
                      ])}
                    />
                  </span>
                </li>
              </ul>
              {user.username !== username ? (
                <div className="m-2 flex gap-2 hover:text-destructive sm:absolute sm:right-0">
                  <ButtonsContainer
                    username={username}
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
      </div>
      <div className="flex flex-col pb-8 md:pb-4 ">
        <div className="w-full">
          <div className="flex bg-gray-700" data-testid="profile-navigation">
            <div className="container mx-auto flex max-w-screen-xl justify-between p-0 text-white sm:pl-8">
              <ul className="flex h-full flex-wrap gap-x-2 text-xs sm:text-base lg:flex lg:gap-8">
                <ListItem
                  href={`/@${username}`}
                  currentTab={currentTab === 'blog'}
                  label={t('navigation.profile_navbar.blog')}
                />
                <ListItem
                  href={`/@${username}/posts`}
                  currentTab={currentTab === 'posts' || currentTab === 'comments' || currentTab === 'payout'}
                  label={t('navigation.profile_navbar.posts')}
                />
                <ListItem
                  href={`/@${username}/replies`}
                  currentTab={currentTab === 'replies'}
                  label={t('navigation.profile_navbar.replies')}
                />
                <ListItem
                  href={`/@${username}/communities`}
                  currentTab={currentTab === 'communities'}
                  label={t('navigation.profile_navbar.social')}
                />
                <ListItem
                  href={`/@${username}/notifications`}
                  currentTab={currentTab === 'notifications'}
                  label={t('navigation.profile_navbar.notifications')}
                />
              </ul>
              <ul className="flex h-full flex-nowrap text-xs sm:text-base lg:flex lg:gap-4">
                <li>
                  <Link
                    href={`${explorerHost}/@${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-4 flex h-12 items-center px-2 hover:bg-background hover:text-primary"
                  >
                    Block Explorer
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${walletHost}/@${username}/transfers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-4 flex h-12 items-center px-2 hover:bg-background hover:text-primary"
                  >
                    {t('navigation.profile_navbar.wallet')}
                  </Link>
                </li>
                {user.isLoggedIn && username === user.username ? (
                  <li>
                    <Link
                      href={`/@${username}/settings`}
                      rel="noopener noreferrer"
                      className={`flex h-12 items-center px-2 hover:bg-background hover:text-primary ${
                        currentTab === `settings`
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
