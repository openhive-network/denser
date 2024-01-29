import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import Loading from '@hive/ui/components/loading';
import { useQuery } from '@tanstack/react-query';
import { getAccount, getDynamicGlobalProperties } from '@hive/ui/lib/hive';
import { getAccountFull } from '@hive/ui/lib/hive';
import { accountReputation } from '@/blog/lib/utils';
import { delegatedHive, numberWithCommas, vestingHive } from '@hive/ui/lib/utils';
import { Separator } from '@hive/ui/components/separator';
import { Icons } from '@hive/ui/components/icons';
import { dateToFullRelative, dateToShow } from '@hive/ui/lib/parse-date';
import { proxifyImageUrl } from '@hive/ui/lib/old-profixy';
import { getTwitterInfo } from '@/blog/lib/bridge';
import moment from 'moment';
import { Button } from '@hive/ui';
import DialogLogin from '../dialog-login';
import { useTranslation } from 'next-i18next';
import { TFunction } from 'i18next';
import env from '@beam-australia/react-env';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { authService } from '@smart-signer/lib/auth-service';
import { BroadcastTransactionRequest, TBlockHash, createHiveChain, createWaxFoundation } from '@hive/wax';
import { toast } from '@ui/components/hooks/use-toast';
import { Signer } from '@smart-signer/lib/signer';
import { getLogger } from '@ui/lib/logging';
import { useFollowingInfiniteQuery } from '../hooks/use-following-infinitequery';
import { getFollowing } from '@/blog/lib/hive';
import { useInfiniteQuery } from '@tanstack/react-query';

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
  const logger = getLogger('app');
  const router = useRouter();
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const walletHost = env('WALLET_ENDPOINT');
  const { username } = useSiteParams();
  const [isFollow, setIsFollow] = useState(false);
  const {
    isLoading: profileDataIsLoading,
    error: errorProfileData,
    data: profileData
  } = useQuery(['profileData', username], () => getAccountFull(username), {
    enabled: !!username
  });

  const {
    isLoading: accountDataIsLoading,
    error: accountDataError,
    data: accountData
  } = useQuery(['accountData', username], () => getAccount(username), {
    enabled: !!username
  });

  const { data: followingData } = useFollowingInfiniteQuery(user?.username || '', 50);

  // const {
  //   data: followingData,
  //   isLoading: followingDataIsLoading,
  //   isFetching: followingDataIsFetching,
  //   error: followingDataError,
  //   isError: followingDataIsError,
  //   status,
  //   isFetchingNextPage,
  //   fetchNextPage,
  //   hasNextPage
  // } = useInfiniteQuery(
  //   ['followingData', user?.username],
  //   ({ pageParam: last_id }) => getFollowing({ account: user?.username, start: last_id, limit: 50 }),
  //   {
  //     enabled: isFollow || Boolean(user?.username),
  //     getNextPageParam: (lastPage) => {
  //       return lastPage.length >= 50 ? lastPage[lastPage.length - 1].following : undefined;
  //     }
  //   }
  // );

  const {
    isLoading: dynamicGlobalDataIsLoading,
    error: dynamicGlobalDataError,
    data: dynamicGlobalData
  } = useQuery(['dynamicGlobalData'], () => getDynamicGlobalProperties());

  const { data: twitterData } = useQuery(['twitterData', username], () => getTwitterInfo(username), {
    enabled: !!username,
    retry: false,
    refetchOnWindowFocus: false
  });

  const follow = useCallback(
    async (e: any, type: string) => {
      console.log('followingData?.pages', followingData?.pages);
      console.log('TYPE', type);
      if (user && user.isLoggedIn) {
        const what = type === 'follow' ? 'blog' : null;
        const follow = {
          id: 'follow',
          json: JSON.stringify([
            'follow',
            {
              follower: user.username,
              following: username,
              what: [what]
            }
          ]),
          required_auths: [],
          required_posting_auths: [user.username]
        };

        console.log('follow', follow);

        // if (type === 'follow') {
        //   vote.weight = -10000;
        // }

        const signer = new Signer();
        try {
          await signer.broadcastTransaction({
            operation: { custom_json: follow },
            loginType: user.loginType,
            username: user.username
          });
          // e.target.classList.add('text-white');
          console.log('type', type);
          console.log('after followingData?.pages', followingData?.pages);
          setIsFollow(
            Boolean(
              followingData?.pages[0].filter((f) => f.follower === user?.username && f.following === username)
                .length
            )
          );
          // if (type === 'follow') {
          //   e.target.classList.add('bg-red-600');
          // }

          // if (type === 'mute') {
          //   e.target.classList.add('bg-gray-600');
          // }
        } catch (e) {
          //
          // TODO Improve messages displayed to user, after we do better
          // (unified) error handling in smart-signer.
          //
          logger.error('got error', e);
          let description = 'Transaction broadcast error';
          if (`${e}`.indexOf('vote on this comment is identical') >= 0) {
            description = 'Your current vote on this comment is identical to this vote.';
          } else if (`${e}`.indexOf('Not implemented') >= 0) {
            description = 'Method not implemented for this login type.';
          }
          toast({
            description,
            variant: 'destructive'
          });
        }
      }
    },
    [followingData?.pages, logger, user, username]
  );

  useEffect(() => {
    console.log('effect followingData?.pages', followingData?.pages);
    setIsFollow(
      Boolean(
        followingData?.pages[0].filter((f) => f.follower === user?.username && f.following === username)
          .length
      )
    );
  }, [followingData?.pages, user?.username, username]);

  if (accountDataIsLoading || dynamicGlobalDataIsLoading || profileDataIsLoading) {
    return <Loading loading={accountDataIsLoading || dynamicGlobalDataIsLoading || profileDataIsLoading} />;
  }
  if (!accountData || !dynamicGlobalData || !profileData) {
    return <p className="my-32 text-center text-3xl">Something went wrong</p>;
  }
  const delegated_hive = delegatedHive(accountData, dynamicGlobalData);
  const vesting_hive = vestingHive(accountData, dynamicGlobalData);
  const hp = vesting_hive.minus(delegated_hive);

  return username ? (
    <div>
      <div
        className=" w-full bg-gray-600 text-sm leading-6 text-zinc-50 sm:h-fit"
        style={{ textShadow: 'rgb(0, 0, 0) 1px 1px 2px' }}
        data-testid="profile-info"
      >
        {profileData ? (
          <div
            style={{
              background:
                profileData?.posting_json_metadata &&
                JSON.parse(profileData?.posting_json_metadata).profile?.cover_image
                  ? `url('${proxifyImageUrl(
                      JSON.parse(profileData?.posting_json_metadata).profile?.cover_image,
                      '2048x512'
                    ).replace(/ /g, '%20')}') center center no-repeat`
                  : '',

              backgroundSize: 'cover'
            }}
            className={`flex h-auto max-h-full min-h-full w-auto min-w-full max-w-full flex-col items-center`}
          >
            <div className="mt-4 flex items-center">
              <div
                className="mr-3 h-[48px] w-[48px] rounded-3xl bg-cover bg-no-repeat"
                style={{
                  backgroundImage: `url(https://images.hive.blog/u/${profileData?.name}/avatar)`
                }}
              />
              <h4 className="sm:text-2xl" data-testid="profile-name">
                <span className="font-semibold">
                  {profileData?.profile?.name ? profileData.profile.name : profileData.name}
                </span>{' '}
                <span
                  title={`This is ${username}s's reputation score.\n\nThe reputation score is based on the history of votes received by the account, and is used to hide low quality content.`}
                >
                  ({accountReputation(profileData.reputation ? profileData.reputation : 0)})
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
                    title={t('user_profil.hive_buzz_badge_title', { username: profileData.name })}
                    className="mx-2 w-6 duration-500 ease-in-out hover:w-12"
                    src={`https://hivebuzz.me/api/level/${profileData.name}?dead`}
                    data-testid="profile-badge-image"
                  />
                </Link>
              ) : null}
              {twitterData ? (
                <Link
                  href={twitterData.twitter_profile}
                  title={t('user_profil.twitter_badge_title')}
                  target="_blank"
                  data-testid="profile-twitter-badge"
                >
                  <Icons.twitter fill="#1da1f2" className="text-blue-400" />
                </Link>
              ) : null}
            </div>

            <p className="my-1 max-w-[420px] text-center text-white sm:my-4" data-testid="profile-about">
              {profileData?.profile?.about
                ? profileData?.profile?.about.slice(0, 157) +
                  (157 < profileData?.profile?.about.length ? '...' : '')
                : null}
            </p>
            <ul className="my-1 flex h-5 gap-1 text-xs sm:text-sm" data-testid="profile-stats">
              <li className="flex items-center gap-1">
                <Link
                  href={`/@${profileData.name}/followers`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {profileData?.follow_stats?.follower_count === 0 || undefined
                    ? t('user_profil.lists.follower_count.zero')
                    : profileData?.follow_stats?.follower_count === 1
                    ? t('user_profil.lists.follower_count.one')
                    : t('user_profil.lists.follower_count.other', {
                        value: profileData?.follow_stats?.follower_count
                      })}
                </Link>
              </li>

              <li
                className="flex items-center
              gap-1"
              >
                {' '}
                <Separator orientation="vertical" className="bg-white" />
                <Link
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                  href={`/@${profileData.name}`}
                >
                  {profileData?.post_count === 0
                    ? t('user_profil.lists.post_count.zero')
                    : profileData?.post_count === 1
                    ? t('user_profil.lists.post_count.one')
                    : t('user_profil.lists.post_count.other', { value: profileData?.post_count })}
                </Link>
              </li>

              <li
                className="flex items-center
              gap-1"
              >
                <Separator orientation="vertical" className="bg-white" />{' '}
                <Link
                  href={`/@${profileData.name}/followed`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {profileData?.follow_stats?.following_count === 0 || undefined
                    ? t('user_profil.lists.followed_count.zero')
                    : profileData?.follow_stats?.following_count === 1
                    ? t('user_profil.lists.followed_count.one')
                    : t('user_profil.lists.followed_count.other', {
                        value: profileData?.follow_stats?.following_count
                      })}
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Separator orientation="vertical" className="bg-white" />
                {numberWithCommas(hp.toFixed(0)) + ' HP'}
              </li>
            </ul>

            <ul className="my-1 flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
              <li className="flex items-center gap-1">
                <Link
                  href={`/@${profileData?.name}/lists/blacklisted`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {t('user_profil.lists.blacklisted_users')}
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Separator orientation="vertical" className="h-4 bg-white" />
                <Link
                  href={`/@${profileData?.name}/lists/muted`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {t('user_profil.lists.muted_users')}
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Separator orientation="vertical" className="h-4 bg-white" />
                <Link
                  href={`/@${profileData?.name}/lists/followed_blacklists`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {t('user_profil.lists.followed_blacklists')}
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Separator orientation="vertical" className="bg-white" />
                <Link
                  href={`/@${profileData?.name}/lists/followed_muted_lists`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {t('user_profil.lists.followed_muted_lists')}
                </Link>
              </li>
            </ul>

            <ul className="my-4 flex h-5 justify-center gap-1 text-xs text-white sm:gap-4 sm:text-sm">
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
                  {t('user_profil.joined')} {profileData?.created ? dateToShow(profileData.created, t) : null}
                </span>
              </li>
              <li className="flex items-center">
                <Icons.calendarActive className="m-1" />
                <span data-testid="user-last-time-active">
                  {t('user_profil.active')}{' '}
                  {compareDates([profileData.created, profileData.last_vote_time, profileData.last_post], t)}
                </span>
              </li>
            </ul>
            {user?.username !== username && user?.isLoggedIn ? (
              <div className="m-2 flex gap-2 hover:text-red-500 sm:absolute sm:right-0">
                {user && user.isLoggedIn ? (
                  <Button
                    className=" hover:text-red-500 "
                    variant="secondary"
                    size="sm"
                    data-testid="profile-follow-button"
                    onClick={(e) => follow(e, isFollow ? '' : 'follow')}
                  >
                    {isFollow ? t('user_profil.unfollow_button') : t('user_profil.follow_button')}
                  </Button>
                ) : (
                  <DialogLogin>
                    <Button
                      className=" hover:text-red-500 "
                      variant="secondary"
                      size="sm"
                      data-testid="profile-follow-button"
                    >
                      {t('user_profil.follow_button')}
                    </Button>
                  </DialogLogin>
                )}

                {user && user.isLoggedIn ? (
                  <Button
                    className=" hover:text-red-500"
                    variant="secondary"
                    size="sm"
                    data-testid="profile-mute-button"
                  >
                    {t('user_profil.mute_button')}
                  </Button>
                ) : (
                  <DialogLogin>
                    <Button
                      className=" hover:text-red-500"
                      variant="secondary"
                      size="sm"
                      data-testid="profile-mute-button"
                    >
                      {t('user_profil.mute_button')}
                    </Button>
                  </DialogLogin>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className={`h-auto max-h-full min-h-full w-auto min-w-full max-w-full bg-gray-600 bg-cover`} />
        )}
      </div>
      <div className="flex flex-col pb-8 md:pb-4 ">
        <div className="w-full">
          <div className="flex h-12 bg-slate-800" data-testid="profile-navigation">
            <div className="container mx-auto flex max-w-screen-xl justify-between p-0 sm:pl-8">
              <ul className="flex h-full gap-2 text-xs text-white sm:text-base lg:flex lg:gap-8">
                <li>
                  <Link
                    href={`/@${username}`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800
                    ${
                      router.asPath === `/@${username}`
                        ? 'bg-white text-slate-800 dark:bg-slate-950  dark:text-slate-200  dark:hover:text-slate-200'
                        : ''
                    }
                    `}
                  >
                    {t('navigation.profil_navbar.blog')}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/posts`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/posts` ||
                      router.asPath === `/@${username}/comments` ||
                      router.asPath === `/@${username}/payout`
                        ? 'bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200  dark:hover:text-slate-200 '
                        : ''
                    }`}
                  >
                    {t('navigation.profil_navbar.posts')}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/replies`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/replies`
                        ? 'bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200  dark:hover:text-slate-200 '
                        : ''
                    }`}
                  >
                    {t('navigation.profil_navbar.replies')}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/communities`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/communities`
                        ? 'bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200  dark:hover:text-slate-200 '
                        : ''
                    }`}
                  >
                    {t('navigation.profil_navbar.social')}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/notifications`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/notifications`
                        ? 'bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:text-slate-200 '
                        : ''
                    }`}
                  >
                    {t('navigation.profil_navbar.notifications')}
                  </Link>
                </li>
              </ul>
              <ul className="flex h-full flex-wrap text-xs text-white sm:text-base lg:flex lg:gap-4">
                <li>
                  <Link
                    href={`${walletHost}/@${username}/transfers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-4 flex h-full items-center px-2 hover:bg-white hover:text-slate-800"
                  >
                    {t('navigation.profil_navbar.wallet')}
                  </Link>
                </li>
                {user?.isLoggedIn && username === user?.username ? (
                  <li>
                    <Link
                      href={`/@${username}/settings`}
                      rel="noopener noreferrer"
                      className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                        router.asPath === `/@${username}/settings`
                          ? 'bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:text-slate-200 '
                          : ''
                      }`}
                    >
                      {t('navigation.profil_navbar.settings')}
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
  ) : (
    <Loading loading={true} />
  );
};

export default ProfileLayout;
