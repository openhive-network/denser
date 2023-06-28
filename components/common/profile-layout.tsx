import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSiteParams } from '@/components/hooks/use-site-params';
import Loading from '@/components/loading';
import { useQuery } from '@tanstack/react-query';
import { getAccount, getAccountFull, getDynamicGlobalProperties } from '@/lib/hive';
import { accountReputation, delegatedHive, numberWithCommas, vestingHive } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { dateToFullRelative, dateToShow } from '@/lib/parse-date';
import { proxifyImageUrl } from '@/lib/old-profixy';

interface IProfileLayout {
  children: React.ReactNode;
}

const ProfileLayout = ({ children }: IProfileLayout) => {
  const router = useRouter();
  const [hivePower, setHivePower] = useState(0);
  const { username } = useSiteParams();
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
  const {
    isLoading: dynamicGlobalDataIsLoading,
    error: dynamicGlobalDataError,
    data: dynamicGlobalData
  } = useQuery(['dynamicGlobalData'], () => getDynamicGlobalProperties());
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
        className=" w-full bg-gray-600  text-sm leading-6 text-zinc-50 sm:h-fit"
        style={{ textShadow: 'rgb(0, 0, 0) 1px 1px 2px' }}
        data-testid="profile-info"
      >
        {profileData?.posting_json_metadata &&
        JSON.parse(profileData?.posting_json_metadata).profile.cover_image !== '' ? (
          <div
            style={{
              background:  JSON.parse(profileData?.posting_json_metadata).profile.cover_image ? `url('${proxifyImageUrl(
                JSON.parse(profileData?.posting_json_metadata).profile.cover_image,
                '2048x512'
              ).replace(/ /g, '%20')}') center center no-repeat` : '',

              backgroundSize: 'cover'
            }}
            className={`flex h-auto max-h-full min-h-full w-auto min-w-full max-w-full flex-col items-center`}
          >
            <div className="mt-4 flex items-center">
              <div
                className="mr-3 h-[48px] w-[48px] rounded-3xl bg-cover bg-no-repeat"
                style={{ backgroundImage: `url(https://images.hive.blog/u/${profileData?.name}/avatar)`}}
              />
              <h4 className="sm:text-2xl" data-testid="profile-name">
                <span className="font-semibold">{profileData?.name}</span>{' '}
                <span>({profileData?.reputation ? accountReputation(profileData.reputation) : null})</span>
              </h4>
            </div>

            <p className="my-1 max-w-[420px] text-center text-white sm:my-4" data-testid="profile-about">
              {profileData?.profile?.about}
            </p>
            <ul className="my-1 flex h-5 gap-1 text-xs sm:text-sm" data-testid="profile-stats">
              <li className="flex items-center gap-1">
                <Link
                  href={`/@${profileData.name}/followers`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {profileData?.follow_stats?.follower_count} followers
                </Link>
              </li>

              <li className="flex items-center gap-1">
                {' '}
                <Separator orientation="vertical" className="bg-white" />
                <Link
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                  href={`/@${profileData.name}`}
                >
                  {profileData?.post_count} posts{' '}
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Separator orientation="vertical" className="bg-white" />{' '}
                <Link
                  href={`/@${profileData.name}/followed`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {profileData?.follow_stats?.following_count} following
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
                  Blacklisted Users
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Separator orientation="vertical" className="h-4 bg-white" />
                <Link
                  href={`/@${profileData?.name}/lists/muted`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  Muted Users
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Separator orientation="vertical" className="h-4 bg-white" />
                <Link
                  href={`/@${profileData?.name}/lists/followed_blacklists`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  Followed Blacklists
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Separator orientation="vertical" className="bg-white" />
                <Link
                  href={`/@${profileData?.name}/lists/followed_muted_lists`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  Followed Muted Lists
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
                <span data-testid="user-joined">Joined {profileData?.created ? dateToShow(profileData.created) : null}</span>
              </li>
              <li className="flex items-center">
                <Icons.calendarActive className="m-1" />
                <span data-testid="user-last-time-active">
                  Active{' '}
                  {profileData?.last_vote_time
                    ? dateToFullRelative(profileData.last_vote_time)
                    : dateToFullRelative(profileData.last_post)}
                </span>
              </li>
            </ul>
          </div>
        ) : (
          <div className={`h-auto max-h-full min-h-full w-auto min-w-full max-w-full bg-gray-600 bg-cover`} />
        )}
      </div>
      <div className="flex flex-col pb-8 md:pb-4 ">
        <div className="w-full">
          <div className="flex h-12 bg-slate-800" data-testid="profile-navigation">
            <div className="container mx-auto flex max-w-screen-xl justify-between justify-between p-0 sm:pl-8">
              <ul className="flex h-full gap-2 text-xs text-white sm:text-base lg:flex lg:gap-8">
                <li>
                  <Link
                    href={`/@${username}`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}` ? 'dark:text-slate-950' : ''
                    }`}
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/posts`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/posts` ||
                      router.asPath === `/@${username}/comments` ||
                      router.asPath === `/@${username}/payout`
                        ? 'dark:text-slate-950'
                        : ''
                    }`}
                  >
                    Posts
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/replies`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/replies` ? 'dark:text-slate-950' : ''
                    }`}
                  >
                    Replies
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/communities`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/communities` ? 'dark:text-slate-950' : ''
                    }`}
                  >
                    Social
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/notifications`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/notifications` ? 'dark:text-slate-950' : ''
                    }`}
                  >
                    Notifications
                  </Link>
                </li>
              </ul>
              <ul className="flex h-full text-xs text-white sm:text-base lg:flex lg:gap-4">
                <li>
                  <Link
                    href={`https://wallet.hive.blog/@${username}/transfers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full items-center px-2 hover:bg-white hover:text-slate-800"
                  >
                    Wallet
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <main className="container mx-auto max-w-screen-xl">{children}</main>
      </div>
    </div>
  ) : (
    <Loading loading={true} />
  );
};

export default ProfileLayout;
