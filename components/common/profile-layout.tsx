import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProfileInfo from '@/components/profile-info';
import { useSiteParams } from '@/components/hooks/use-site-params';
import Loading from '@/components/loading';
import { useQuery } from '@tanstack/react-query';
import { getAccount, getAccountFull, getDynamicGlobalProperties } from '@/lib/hive';
import { accountReputation } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { dateToRelative, dateToShow } from '@/lib/parse-date';
import { proxifyImageSrc } from '@/lib/proxify-images';

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

  return username ? (
    <div>
      <div
        className="min-h-56 h-fit max-h-72 w-full text-xs text-zinc-50"
        style={{ textShadow: 'rgb(0, 0, 0) 1px 1px 2px' }}
      >
        {profileData?.posting_json_metadata &&
        JSON.parse(profileData?.posting_json_metadata).profile.cover_image !== '' ? (
          <div
            style={{
              background: `url('${proxifyImageSrc(
                JSON.parse(profileData?.posting_json_metadata).profile.cover_image,
                1800,
                0,
                'webp'
              )}') center center no-repeat`,
              backgroundSize: 'cover'
            }}
            className={`flex h-auto max-h-full min-h-full w-auto min-w-full max-w-full flex-col items-center py-6`}
          >
            <div className="flex items-center">
              <img
                className="mr-3 h-[48px] w-[48px] rounded-3xl"
                height="48"
                width="48"
                src={`https://images.hive.blog/u/${profileData?.name}/avatar`}
                alt={`${profileData?.profile?.name} profile picture`}
                loading="lazy"
              />
              <h4 className="mb-4 mt-8 text-2xl" data-testid="profile-name">
                <span className="font-semibold">{profileData?.profile?.name}</span>{' '}
                <span>({profileData?.reputation ? accountReputation(profileData.reputation) : null})</span>
              </h4>
            </div>

            <p className="my-4 max-w-[420px] text-center text-white" data-testid="profile-about">
              {profileData?.profile?.about}
            </p>
            <ul className="flex h-5 gap-2">
              <li>{profileData?.follow_stats?.follower_count} followers</li>
              <Separator orientation="vertical" className="bg-white" />
              <li>{profileData?.post_count} posts</li>
              <Separator orientation="vertical" className="bg-white" />
              <li>{profileData?.follow_stats?.following_count} following</li>
              <Separator orientation="vertical" className="bg-white" />
              <li>123 HP</li>
            </ul>

            <ul className="flex h-5 gap-2">
              <li>
                <Link
                  href={`/@${profileData?.name}/lists/blacklisted`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  Blacklisted Users
                </Link>
              </li>
              <Separator orientation="vertical" className="bg-white" />
              <li>
                <Link
                  href={`/@${profileData?.name}/lists/muted`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  Muted Users
                </Link>
              </li>
              <Separator orientation="vertical" className="bg-white" />
              <li>
                <Link
                  href={`/@${profileData?.name}/lists/followed_blacklists`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  Followed Blacklists
                </Link>
              </li>
              <Separator orientation="vertical" className="bg-white" />
              <li>
                <Link
                  href={`/@${profileData?.name}/lists/followed_muted_lists`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  Followed Muted Lists
                </Link>
              </li>
            </ul>

            <ul className="flex h-5 gap-4 text-white">
              <li className="flex">
                <Icons.mapPin className="mr-2" />
                <span>{profileData?.profile?.location}</span>
              </li>
              <li className="flex">
                <Icons.globe2 className="mr-2" />
                <Link
                  target="_external"
                  className="website-link"
                  href={`https://${profileData?.profile?.website?.replace(/^(https?|ftp):\/\//, '')}`}
                >
                  <span>{profileData?.profile?.website}</span>
                </Link>
              </li>
              <li className="flex">
                <Icons.calendarHeart className="mr-2" />
                <span>Joined {profileData?.created ? dateToShow(profileData.created) : null}</span>
              </li>
              <li className="flex">
                <Icons.calendarActive className="mr-2" />
                <span>
                  Active {profileData?.last_post ? dateToRelative(profileData.last_post) : null} ago
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
            <div className="container mx-auto flex max-w-screen-xl justify-between">
              <ul className="grid h-full grid-cols-2 gap-4 text-white lg:flex lg:gap-8">
                <li>
                  <Link
                    href={`/@${username}`}
                    className={`flex h-full items-center hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}` ? 'dark:text-slate-950' : ''
                    }`}
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/posts`}
                    className={`flex h-full items-center hover:bg-white hover:text-slate-800 ${
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
                    className={`flex h-full items-center hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/replies` ? 'dark:text-slate-950' : ''
                    }`}
                  >
                    Replies
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/communities`}
                    className={`flex h-full items-center hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/communities` ? 'dark:text-slate-950' : ''
                    }`}
                  >
                    Social
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/notifications`}
                    className={`flex h-full items-center hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/notifications` ? 'dark:text-slate-950' : ''
                    }`}
                  >
                    Notifications
                  </Link>
                </li>
              </ul>
              <ul className="flex h-full text-white lg:flex lg:gap-4">
                <li>
                  <Link
                    href={`https://wallet.hive.blog/@${username}/transfers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full items-center hover:bg-white hover:text-slate-800"
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
