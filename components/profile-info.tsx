import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getAccountFull, getAccount, getDynamicGlobalProperties } from '@/lib/hive';
import { accountReputation, getHivePower, numberWithCommas } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useSiteParams } from '@/components/hooks/use-site-params';
import { dateToRelative, dateToShow } from '@/lib/parse-date';
import Loading from '@/components/loading';

const ProfileInfo = ({ handleCoverImage }: { handleCoverImage: any }) => {
  const [profile, setProfile] = useState<any>(undefined);
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

  // useEffect(() => {
  //   if (!dynamicGlobalDataIsLoading && !accountDataIsLoading) {
  //     setHivePower(
  //       getHivePower(
  //         dynamicGlobalData?.total_vesting_fund_hive.split(" ")[0],
  //         dynamicGlobalData?.total_vesting_shares.split(" ")[0],
  //         accountData[0].vesting_shares.split(" ")[0],
  //         accountData[0].delegated_vesting_shares.split(" ")[0],
  //         accountData[0].received_vesting_shares.split(" ")[0]
  //       )
  //     )
  //   }
  // }, [dynamicGlobalDataIsLoading, accountDataIsLoading])

  useEffect(() => {
    if (!profileDataIsLoading && profileData?.posting_json_metadata) {
      handleCoverImage(
        JSON.parse(profileData?.posting_json_metadata).profile.cover_image
          ? JSON.parse(profileData?.posting_json_metadata).profile.cover_image
          : ''
      );
    }
  }, [profileDataIsLoading, profileData, handleCoverImage]);

  useEffect(() => {
    if (!accountDataIsLoading && profileData?.posting_json_metadata) {
      setProfile(JSON.parse(profileData.posting_json_metadata).profile);
    }
  }, [accountDataIsLoading, profileData]);

  if (profileDataIsLoading || accountDataIsLoading || dynamicGlobalDataIsLoading) return <Loading />;

  return (
    <div className="mt-[-6rem] px-8 md:w-80" data-testid="profile-info">
      <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-white dark:bg-slate-900">
        <img className="h-36 w-36 rounded-md" src={profile?.profile_image} alt="Profile picture" />
      </div>
      <h4 className="mb-4 mt-8 text-xl text-slate-900 dark:text-white" data-testid="profile-name">
        {profileData?.profile?.name}{' '}
        <span className="text-slate-600">
          ({profileData?.reputation ? accountReputation(profileData.reputation) : null})
        </span>
      </h4>
      <h6
        className="my-4 bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent"
        data-testid="profile-nickname"
      >
        @{profileData?.name}
      </h6>
      <p className="my-4" data-testid="profile-about">
        {profile?.about}
      </p>
      <p className="my-4 flex text-slate-900 dark:text-white" data-testid="user-last-time-active">
        <Icons.calendarActive className="mr-2" />
        Active {profileData?.last_post ? dateToRelative(profileData.last_post) : null} ago
      </p>
      <p className="my-4 flex text-slate-900 dark:text-white" data-testid="user-joined">
        <Icons.calendarHeart className="mr-2" />
        Joined {profileData?.created ? dateToShow(profileData.created) : null}
      </p>
      <p className="my-4 flex text-slate-900 dark:text-white" data-testid="user-location">
        <Icons.mapPin className="mr-2" />
        {profileData?.profile?.location}
      </p>

      <div className="my-4 grid grid-cols-2 gap-4" data-testid="profile-stats">
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">{profileData?.post_count}</span>
          Number of posts
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">{numberWithCommas(hivePower)}</span>
          HP
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">{profileData?.follow_stats?.following_count}</span>
          Following
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white">{profileData?.follow_stats?.follower_count}</span>
          Followers
        </div>
      </div>

      <div className="flex gap-x-4">
        <Button
          size="sm"
          variant="outline"
          className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          data-testid="profile-follow-button"
        >
          <Icons.userPlus className="mr-2 h-4 w-4" />
          Follow
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="mb-8 mt-4 border-red-600 text-base text-red-600 hover:bg-red-500 hover:text-white dark:border-red-600 dark:text-red-600"
          data-testid="profile-mute-button"
        >
          <Icons.micOff className="mr-2 h-4 w-4" />
          Mute
        </Button>
      </div>

      <div data-testid="user-links">
        <h6 className="text-slate-900 dark:text-white">Links</h6>
        {profileData?.profile?.website ? (
          <p className="my-3 flex flex-wrap">
            <Icons.globe2 className="mr-2" />
            <Link
              target="_external"
              className="website-link"
              href={`https://${profileData?.profile?.website.replace(/^(https?|ftp):\/\//, '')}`}
            >
              <span className="text-slate-900 dark:text-white">{profileData?.profile?.website}</span>
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ProfileInfo;
