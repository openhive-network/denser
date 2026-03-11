'use client';

import React, { ReactNode } from 'react';
import { Link } from '@hive/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@hive/ui/components/dropdown-menu';
import { MoreHorizontal, ExternalLink, Wallet, Settings } from 'lucide-react';
import clsx from 'clsx';
import BasePathLink from '@/blog/components/base-path-link';
import { useQuery } from '@tanstack/react-query';
import env from '@beam-australia/react-env';

import { useTranslation } from '@/blog/i18n/client';
import { Avatar, AvatarFallback, AvatarImage, proxifyImageSrc, getUserAvatarUrl, getDefaultImageUrl, escapeCssUrl, isSafeImageUrl, isSafeExternalUrl } from '@ui/components';
import { Separator } from '@hive/ui/components/separator';
import TimeAgo from '@ui/components/time-ago';
import { Icons } from '@hive/ui/components/icons';
import { dateToShow } from '@ui/lib/parse-date';
import { convertToHP, numberWithCommas } from '@ui/lib/utils';
import userIllegalContent from '@ui/config/lists/user-illegal-content';
import gdprUserList from '@ui/config/lists/gdpr-user-list';
import { convertStringToBig } from '@ui/lib/helpers';
import { getUserLevel, getLevelIconPath, getLevelDisplayName } from '@ui/lib/user-level';

import { accountReputation, compareDates } from '@/blog/lib/utils';
import CustomError from '@/blog/components/custom-error';
import NoDataError from '@/blog/components/no-data-error';
import { getAccountFull, getAccountReputations, getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import { getChain } from '@transaction/lib/chain';

import ButtonsContainer from '@/blog/features/mute-follow/buttons-container';
import { notFound, usePathname } from 'next/navigation';
import { useFollowingInfiniteQuery } from '@/blog/features/account-lists/hooks/use-following-infinitequery';
import { getTwitterInfo, isThirdPartyApiEnabled } from '@transaction/lib/custom-api';
import ListItem from './list-item';
import ProfileLayoutSkeleton from './profile-layout-skeleton';
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
  const thirdPartyEnabled = isThirdPartyApiEnabled();

  const {
    data: profileData,
    isError: isProfileError,
    isLoading: isProfilePending
  } = useQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username),
    enabled: !!username
  });

  const mute = useFollowingInfiniteQuery(user.username, 1000, 'ignore', ['ignore']);
  const following = useFollowingInfiniteQuery(user.username, 1000, 'blog', ['blog']);

  // When viewing own profile, derive the following count from the client-side
  // `following` query (source of truth with optimistic updates) instead of
  // `profileData.follow_stats` which can be overwritten by stale server hydration.
  const isOwnProfile = user.isLoggedIn && username === user.username;
  const followingCount =
    isOwnProfile && following.data?.pages
      ? following.data.pages.reduce((sum, page) => sum + page.length, 0)
      : (profileData?.follow_stats?.following_count ?? 0);

  const { data: accountReputationData } = useQuery({
    queryKey: ['accountReputationData', username],
    queryFn: () => getAccountReputations(username, 1),
    enabled: !!username
  });

  const { data: twitterData } = useQuery({
    queryKey: ['twitterData', username],
    queryFn: () => getTwitterInfo(username),
    enabled: !!username && thirdPartyEnabled,
    retry: false,
    refetchOnWindowFocus: false
  });
  const {
    data: dynamicGlobalData,
    isError: isDynamicGlobalError,
    isLoading: isDynamicGlobalPending
  } = useQuery({
    queryKey: ['dynamicGlobalData'],
    queryFn: () => getDynamicGlobalProperties()
  });

  const {
    data: hiveChain,
    isError: isChainError,
    isLoading: isChainPending
  } = useQuery({
    queryKey: ['hiveChain'],
    queryFn: () => getChain(),
    staleTime: Infinity
  });

  // Handle API errors - show error state with retry option
  if (isProfileError || isDynamicGlobalError || isChainError) {
    return <NoDataError />;
  }

  // Handle loading state - wait for data (including hiveChain initialization)
  if (isProfilePending || isDynamicGlobalPending || isChainPending || !hiveChain) {
    return <ProfileLayoutSkeleton />;
  }

  // Handle user not found - API succeeded but user doesn't exist
  if (!profileData) {
    return notFound();
  }

  // Handle missing required profile fields (data integrity issue)
  if (
    !dynamicGlobalData ||
    !profileData.delegated_vesting_shares ||
    !profileData.received_vesting_shares ||
    !profileData.vesting_shares
  ) {
    return <NoDataError />;
  }

  const delegated_hive = convertToHP(
    convertStringToBig(profileData.delegated_vesting_shares).minus(
      convertStringToBig(profileData.received_vesting_shares)
    ),
    hiveChain,
    dynamicGlobalData.total_vesting_shares,
    dynamicGlobalData.total_vesting_fund_hive
  );
  const vesting_hive = convertToHP(
    convertStringToBig(profileData.vesting_shares),
    hiveChain,
    dynamicGlobalData.total_vesting_shares,
    dynamicGlobalData.total_vesting_fund_hive
  );
  const hp = vesting_hive.minus(delegated_hive);

  // Calculate user level from raw VESTS (not HP)
  const userVests = convertStringToBig(profileData.vesting_shares);
  const userLevel = getUserLevel(userVests);

  const legalBlockedUser = userIllegalContent.includes(username);
  if (userFromGDPRList) {
    return <CustomError />;
  }
  return (
    <div>
      <div
        className={clsx('relative w-full bg-slate-800 text-sm leading-6', {
          'animate-pulse': profileData._temporary
        })}
        data-testid="profile-info"
      >
        {/* Cover Image Background */}
        <div
          style={{
            backgroundImage: getCoverImageStyle(profileData),
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover'
          }}
          className="relative min-h-[280px] sm:min-h-[320px]"
        >
          {/* Gradient Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

          {/* Content Container */}
          <div className="relative flex h-full min-h-[280px] flex-col items-center justify-center px-4 py-6 text-white sm:min-h-[320px]">
            {/* Glassmorphism Card */}
            <div className="w-full max-w-2xl rounded-2xl bg-black/30 p-6 backdrop-blur-sm sm:p-8">
              {/* Avatar and Name Row */}
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <Avatar className="h-20 w-20 shrink-0 ring-4 ring-white/30 sm:h-24 sm:w-24">
                  <AvatarImage
                    className="h-full w-full object-cover"
                    src={getUserAvatarUrl(profileData?.name || '', 'large')}
                    alt="Profile picture"
                  />
                  <AvatarFallback>
                    <img
                      className="h-full w-full object-cover"
                      src={getDefaultImageUrl()}
                      alt="Profile picture"
                    />
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-1 flex-col items-center text-center sm:items-start sm:text-left">
                  {/* Username Row */}
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <h1 className="text-2xl font-bold sm:text-3xl" data-testid="profile-name">
                      {profileData?.profile?.name ? profileData.profile.name : profileData.name}
                    </h1>
                    <span
                      className="rounded-full bg-white/20 px-2 py-0.5 text-sm font-medium"
                      title={`This is ${username}'s reputation score.\n\nThe reputation score is based on the history of votes received by the account, and is used to hide low quality content.`}
                    >
                      {accountReputationData && accountReputationData[0]?.reputation
                        ? accountReputation(accountReputationData[0].reputation)
                        : 25}
                    </span>
                    {profileData.name ? (
                      <Link
                        href={`https://hivebuzz.me/@${profileData.name}`}
                        target="_blank"
                        data-testid="profile-level-link"
                      >
                        <img
                          alt={`${getLevelDisplayName(userLevel)} level`}
                          title={t('user_profile.user_level_title', {
                            level: getLevelDisplayName(userLevel),
                            username: profileData.name
                          })}
                          className="h-6 w-6 transition-transform duration-300 hover:scale-150"
                          src={getLevelIconPath(userLevel)}
                          data-testid="profile-level-image"
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
                        <Icons.twitter fill="#1da1f2" className="h-5 w-5" />
                      </Link>
                    ) : null}
                  </div>

                  {/* Bio */}
                  {!legalBlockedUser && profileData?.profile?.about ? (
                    <p
                      className="mt-3 max-w-md text-sm leading-relaxed text-white/90 sm:text-base"
                      data-testid="profile-about"
                    >
                      {profileData.profile.about.slice(0, 157) +
                        (157 < profileData.profile.about.length ? '...' : '')}
                    </p>
                  ) : null}
                </div>
              </div>

              {!legalBlockedUser ? (
                <>
                  {/* Stats Grid */}
                  <div
                    className="mt-6 grid grid-cols-4 gap-2 border-t border-white/10 pt-6 sm:gap-4"
                    data-testid="profile-stats"
                  >
                    <Link
                      href={`/@${profileData.name}/followers`}
                      className="group flex flex-col items-center transition-colors"
                    >
                      <span className="text-lg font-semibold sm:text-xl">
                        {profileData?.follow_stats?.follower_count ?? 0}
                      </span>
                      <span className="text-xs text-white/70 group-hover:text-white sm:text-sm">
                        {t('user_profile.lists.followers_label')}
                      </span>
                    </Link>
                    <Link
                      href={`/@${profileData.name}`}
                      className="group flex flex-col items-center transition-colors"
                    >
                      <span className="text-lg font-semibold sm:text-xl">{profileData?.post_count ?? 0}</span>
                      <span className="text-xs text-white/70 group-hover:text-white sm:text-sm">
                        {t('user_profile.lists.posts_label')}
                      </span>
                    </Link>
                    <Link
                      href={`/@${profileData.name}/followed`}
                      className="group flex flex-col items-center transition-colors"
                    >
                      <span className="text-lg font-semibold sm:text-xl">{followingCount}</span>
                      <span className="text-xs text-white/70 group-hover:text-white sm:text-sm">
                        {t('user_profile.lists.following_label')}
                      </span>
                    </Link>
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-semibold sm:text-xl">
                        {numberWithCommas(hp.toFixed(0))}
                      </span>
                      <span className="text-xs text-white/70 sm:text-sm">HP</span>
                    </div>
                  </div>

                  {/* Secondary Links - Subtle styling */}
                  <div className="mt-4 flex flex-wrap justify-center gap-x-2 gap-y-1 text-xs text-white/60 sm:text-sm">
                    <BasePathLink
                      href={`/@${profileData?.name}/lists/blacklisted`}
                      className="transition-colors hover:text-white"
                    >
                      {t('user_profile.lists.blacklisted_users')}
                    </BasePathLink>
                    <span className="text-white/30">•</span>
                    <BasePathLink
                      href={`/@${profileData?.name}/lists/muted`}
                      className="transition-colors hover:text-white"
                    >
                      {t('user_profile.lists.muted_users')}
                    </BasePathLink>
                    <span className="text-white/30">•</span>
                    <BasePathLink
                      href={`/@${profileData?.name}/lists/followed_blacklists`}
                      className="transition-colors hover:text-white"
                    >
                      {t('user_profile.lists.followed_blacklists')}
                    </BasePathLink>
                    <span className="text-white/30">•</span>
                    <BasePathLink
                      href={`/@${profileData?.name}/lists/followed_muted_lists`}
                      className="transition-colors hover:text-white"
                    >
                      {t('user_profile.lists.followed_muted_lists')}
                    </BasePathLink>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/70 sm:text-sm">
                    {profileData?.profile?.location ? (
                      <div className="flex items-center gap-1">
                        <Icons.mapPin className="h-4 w-4" />
                        <span data-testid="user-location">{profileData.profile.location}</span>
                      </div>
                    ) : null}
                    {profileData?.profile?.website ? (
                      <div className="flex items-center gap-1">
                        <Icons.globe2 className="h-4 w-4" />
                        <Link
                          target="_external"
                          className="transition-colors hover:text-white"
                          href={`https://${profileData.profile.website.replace(/^(https?|ftp):\/\//, '')}`}
                        >
                          {profileData.profile.website}
                        </Link>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1">
                      <Icons.calendarHeart className="h-4 w-4" />
                      <span data-testid="user-joined">
                        {t('user_profile.joined')}{' '}
                        {profileData?.created ? dateToShow(profileData.created, t) : null}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icons.calendarActive className="h-4 w-4" />
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
                    </div>
                  </div>

                  {/* Follow/Mute Buttons */}
                  {user.username !== username ? (
                    <div className="mt-6 flex justify-center gap-3">
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
                <div className="mt-6 text-center text-white/70">
                  {t('global.unavailable_for_legal_reasons')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col pb-8 md:pb-4 ">
        <div className="w-full">
          <div className="bg-gray-700" data-testid="profile-navigation">
            <div className="container mx-auto max-w-screen-xl px-0 sm:px-8">
              <div className="flex items-center justify-between">
                {/* Primary tabs - scrollable on mobile */}
                <nav className="flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <ul className="flex gap-1 text-white sm:gap-2">
                    <ListItem
                      href={`/@${username}`}
                      currentTab={currentTab === 'blog'}
                      label={t('navigation.profile_navbar.blog')}
                    />
                    <ListItem
                      href={`/@${username}/posts`}
                      currentTab={
                        currentTab === 'posts' || currentTab === 'comments' || currentTab === 'payout'
                      }
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
                </nav>
                {/* Secondary links - hidden on mobile */}
                <ul className="hidden flex-shrink-0 items-center gap-1 text-white md:flex">
                  <li>
                    <Link
                      href={`${explorerHost}/@${username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium text-white/70 transition-colors hover:text-white/90"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('navigation.profile_navbar.block_explorer')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${walletHost}/@${username}/transfers`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium text-white/70 transition-colors hover:text-white/90"
                    >
                      <Wallet className="h-4 w-4" />
                      {t('navigation.profile_navbar.wallet')}
                    </Link>
                  </li>
                  {user.isLoggedIn && username === user.username ? (
                    <li>
                      <Link
                        href={`/@${username}/settings`}
                        rel="noopener noreferrer"
                        className={clsx(
                          'relative flex h-12 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium transition-colors hover:text-white/90',
                          currentTab === 'settings'
                            ? 'text-white after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-red-500'
                            : 'text-white/70'
                        )}
                      >
                        <Settings className="h-4 w-4" />
                        {t('navigation.profile_navbar.settings')}
                      </Link>
                    </li>
                  ) : null}
                </ul>
                {/* Mobile dropdown for secondary links */}
                <div className="flex-shrink-0 md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex h-12 items-center px-3 text-white/70 transition-colors hover:text-white/90"
                        aria-label="More options"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`${explorerHost}/@${username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t('navigation.profile_navbar.block_explorer')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`${walletHost}/@${username}/transfers`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <Wallet className="h-4 w-4" />
                          {t('navigation.profile_navbar.wallet')}
                        </Link>
                      </DropdownMenuItem>
                      {user.isLoggedIn && username === user.username ? (
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/@${username}/settings`}
                            className="flex cursor-pointer items-center gap-2"
                          >
                            <Settings className="h-4 w-4" />
                            {t('navigation.profile_navbar.settings')}
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>
        <main className="container mx-auto max-w-screen-xl pt-4">{children}</main>
      </div>
    </div>
  );
};

export default ProfileLayout;
