import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  getAccountFull,
  getAccount,
  getDynamicGlobalProperties,
  getAccountReputations
} from '@transaction/lib/hive';
import { accountReputation } from '@/blog/lib/utils';
import { numberWithCommas } from '@ui/lib/utils';
import { Icons } from '@ui/components/icons';
import { Button } from '@ui/components/button';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import { dateToFullRelative, dateToShow } from '@ui/lib/parse-date';
import Loading from '@ui/components/loading';
import { useTranslation } from 'next-i18next';

const ProfileInfo = ({ handleCoverImage }: { handleCoverImage: any }) => {
  const { t } = useTranslation('common_blog');
  const [profile, setProfile] = useState<any>(undefined);
  const [hivePower, setHivePower] = useState('0');
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

  if (profileDataIsLoading || accountDataIsLoading || dynamicGlobalDataIsLoading)
    return <Loading loading={profileDataIsLoading || accountDataIsLoading || dynamicGlobalDataIsLoading} />;

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
        {t('cards.user_profil.joined')}{' '}
        {profileData?.last_post ? dateToFullRelative(profileData.last_post, t) : null}
      </p>
      <p className="my-4 flex text-slate-900 dark:text-white" data-testid="user-joined">
        <Icons.calendarHeart className="mr-2" />
        {t('cards.user_profil.active')} {profileData?.created ? dateToShow(profileData.created, t) : null}
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
