import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSiteParams } from "@hive/ui/components/hooks/use-site-params";
import Loading from "@hive/ui/components/loading";
import { useQuery } from "@tanstack/react-query";
import { getAccount, getDynamicGlobalProperties } from "@hive/ui/lib/hive";
import { getAccountFull } from "@hive/ui/lib/hive";
import { accountReputation } from "@/blog/lib/utils";
import {
  delegatedHive,
  numberWithCommas,
  vestingHive,
} from "@hive/ui/lib/utils";
import { Icons } from "@hive/ui/components/icons";
import { dateToFullRelative, dateToShow } from "@hive/ui/lib/parse-date";
import { proxifyImageUrl } from "@hive/ui/lib/old-profixy";
import { getTwitterInfo } from "@/blog/lib/bridge";
import moment from "moment";
import { Button, Separator } from "@hive/ui";
import DialogLogin from "../dialog-login";
import { useTranslation } from "next-i18next";
import { TFunction } from "i18next";

interface IProfileLayout {
  children: React.ReactNode;
}

function compareDates(
  dateStrings: string[],
  t: TFunction<"common_wallet", undefined>
) {
  const dates = dateStrings.map((dateStr) => moment(dateStr));

  const today = moment();
  let closestDate = dates[0];
  let minDiff = Math.abs(today.diff(dates[0], "days"));

  dates.forEach((date) => {
    const diff = Math.abs(date.diff(today, "days"));
    if (diff < minDiff) {
      minDiff = diff;
      closestDate = date;
    }
  });

  const closestDateString = closestDate.format("YYYY-MM-DDTHH:mm:ss");
  return dateToFullRelative(closestDateString, t);
}

const ProfileLayout = ({ children }: IProfileLayout) => {
  const router = useRouter();
  const [design, setDesign] = useState(false)
  const { t } = useTranslation("common_blog");
  const { username } = useSiteParams();
  const {
    isLoading: profileDataIsLoading,
    error: errorProfileData,
    data: profileData,
  } = useQuery(["profileData", username], () => getAccountFull(username), {
    enabled: !!username,
  });

  const {
    isLoading: accountDataIsLoading,
    error: accountDataError,
    data: accountData,
  } = useQuery(["accountData", username], () => getAccount(username), {
    enabled: !!username,
  });

  const {
    isLoading: dynamicGlobalDataIsLoading,
    error: dynamicGlobalDataError,
    data: dynamicGlobalData,
  } = useQuery(["dynamicGlobalData"], () => getDynamicGlobalProperties());

  const { data: twitterData } = useQuery(
    ["twitterData", username],
    () => getTwitterInfo(username),
    {
      enabled: !!username,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  if (
    accountDataIsLoading ||
    dynamicGlobalDataIsLoading ||
    profileDataIsLoading
  ) {
    return (
      <Loading
        loading={
          accountDataIsLoading ||
          dynamicGlobalDataIsLoading ||
          profileDataIsLoading
        }
      />
    );
  }
  if (!accountData || !dynamicGlobalData || !profileData) {
    return <p className="my-32 text-center text-3xl">Something went wrong</p>;
  }
  const delegated_hive = delegatedHive(accountData, dynamicGlobalData);
  const vesting_hive = vestingHive(accountData, dynamicGlobalData);
  const hp = vesting_hive.minus(delegated_hive);

  return username&& design ? (
    <div className="flex">
      <div
        className="bg-gray-600 text-sm leading-6 text-zinc-50 h-fit max-w-[350px]"
        style={{ textShadow: "rgb(0, 0, 0) 1px 1px 2px" }}
        data-testid="profile-info"
      >
        {profileData ? (
          <div
            className={`flex h-auto max-h-full min-h-full w-auto min-w-full max-w-full flex-col`}
          >
            <div className="flex max-h-[180px] items-center overflow-hidden bg-transparent ">
              <picture className="articles__feature-img h-full w-full">
                <source
                  srcSet={
                    JSON.parse(profileData?.posting_json_metadata).profile
                      ?.cover_image
                      ? proxifyImageUrl(
                          JSON.parse(profileData?.posting_json_metadata).profile
                            ?.cover_image,
                          "512x512"
                        )
                      : ""
                  }
                />
                <img
                  srcSet={
                    JSON.parse(profileData?.posting_json_metadata).profile
                      ?.cover_image
                      ? proxifyImageUrl(
                          JSON.parse(profileData?.posting_json_metadata).profile
                            ?.cover_image,
                          "2048x512"
                        )
                      : ""
                  }
                  alt="Post image"
                  loading="lazy"
                  className="w-full"
                />
              </picture>
            </div>

            <div className="mt-[-60px] mx-4 flex items-end">
              <div
                className="h-[128px] w-[128px] rounded-full bg-cover bg-no-repeat border-4"
                style={{
                  backgroundImage: `url(https://images.hive.blog/u/${profileData?.name}/avatar)`,
                }}
              />
              <div className="flex py-4">
                {profileData.name ? (
                  <Link
                    href={`https://hivebuzz.me/@${profileData.name}`}
                    target="_blank"
                  >
                    <img
                      alt="fish image"
                      title={t("user_profil.hive_buzz_badge_title", {
                        username: profileData.name,
                      })}
                      className="mx-2 w-6 duration-500 ease-in-out hover:w-12"
                      src={`https://hivebuzz.me/api/level/${profileData.name}?dead`}
                    />
                  </Link>
                ) : null}
                {twitterData ? (
                  <Link
                    href={twitterData.twitter_profile}
                    title={t("user_profil.twitter_badge_title")}
                    target="_blank"
                  >
                    <Icons.twitter fill="#1da1f2" className="text-blue-400" />
                  </Link>
                ) : null}
              </div>
            </div>

            <h4 className="sm:text-2xl p-2" data-testid="profile-name">
              <span className="font-semibold">
                {profileData?.profile?.name
                  ? profileData.profile.name
                  : profileData.name}
              </span>{" "}
              <span
                title={`This is ${username}s's reputation score.\n\nThe reputation score is based on the history of votes received by the account, and is used to hide low quality content.`}
              >
                (
                {accountReputation(
                  profileData.reputation ? profileData.reputation : 0
                )}
                )
              </span>
            
              <button className="text-xs" onClick={()=>setDesign(!design)}>o</button>
            </h4>
            
            <Separator />
            <p
              className="text-slate-100 px-4 italic"
              data-testid="profile-about"
            >
              {profileData?.profile?.about ? profileData?.profile?.about : null}
            </p>

            <Separator />

            <ul className="flex flex-col py-1 text-xs text-white gap-1 sm:text-sm">
              {profileData?.profile?.location ? (
                <li className="flex items-center">
                  <Icons.mapPin className="m-1" />
                  <span data-testid="user-location">
                    {profileData?.profile?.location}
                  </span>
                </li>
              ) : null}
              {profileData?.profile?.website ? (
                <li className="flex items-center">
                  <Icons.globe2 className="m-1" />
                  <Link
                    target="_external"
                    className="website-link break-words "
                    href={`https://${profileData?.profile?.website?.replace(
                      /^(https?|ftp):\/\//,
                      ""
                    )}`}
                  >
                    <span>{profileData?.profile?.website}</span>
                  </Link>
                </li>
              ) : null}
              <li className="flex items-center">
                <Icons.calendarHeart className="m-1" />
                <span data-testid="user-joined">
                  {t("user_profil.joined")}{" "}
                  {profileData?.created
                    ? dateToShow(profileData.created, t)
                    : null}
                </span>
              </li>
              <li className="flex items-center">
                <Icons.calendarActive className="m-1" />
                <span data-testid="user-last-time-active">
                  {t("user_profil.active")}{" "}
                  {compareDates(
                    [
                      profileData.created,
                      profileData.last_vote_time,
                      profileData.last_post,
                    ],
                    t
                  )}
                </span>
              </li>
            </ul>
            <Separator />
            <ul
              className="p-1 flex gap-1 text-xs sm:text-sm flex-col"
              data-testid="profile-stats"
            >
              <li className="flex items-center gap-1">
                <Link
                  href={`/@${profileData.name}/followers`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {profileData?.follow_stats?.follower_count === 0 || undefined
                    ? t("user_profil.lists.follower_count.zero")
                    : profileData?.follow_stats?.follower_count === 1
                    ? t("user_profil.lists.follower_count.one")
                    : t("user_profil.lists.follower_count.other", {
                        value: profileData?.follow_stats?.follower_count,
                      })}
                </Link>
              </li>

              <li
                className="flex items-center
              gap-1"
              >
                {" "}
                <Link
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                  href={`/@${profileData.name}`}
                >
                  {profileData?.post_count === 0
                    ? t("user_profil.lists.post_count.zero")
                    : profileData?.post_count === 1
                    ? t("user_profil.lists.post_count.one")
                    : t("user_profil.lists.post_count.other", {
                        value: profileData?.post_count,
                      })}
                </Link>
              </li>

              <li
                className="flex items-center
              gap-1"
              >
                <Link
                  href={`/@${profileData.name}/followed`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {profileData?.follow_stats?.following_count === 0 || undefined
                    ? t("user_profil.lists.followed_count.zero")
                    : profileData?.follow_stats?.following_count === 1
                    ? t("user_profil.lists.followed_count.one")
                    : t("user_profil.lists.followed_count.other", {
                        value: profileData?.follow_stats?.following_count,
                      })}
                </Link>
              </li>

              <li className="flex items-center gap-1">
                {numberWithCommas(hp.toFixed(0)) + " HP"}
              </li>
            </ul>
            <Separator />

            <ul className="p-1 flex-col flex flex-wrap gap-2 text-xs sm:text-sm">
              <li className="flex items-center gap-1">
                <Link
                  href={`/@${profileData?.name}/lists/blacklisted`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {t("user_profil.lists.blacklisted_users")}
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Link
                  href={`/@${profileData?.name}/lists/muted`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {t("user_profil.lists.muted_users")}
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Link
                  href={`/@${profileData?.name}/lists/followed_blacklists`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {t("user_profil.lists.followed_blacklists")}
                </Link>
              </li>

              <li className="flex items-center gap-1">
                <Link
                  href={`/@${profileData?.name}/lists/followed_muted_lists`}
                  className="hover:cursor-pointer hover:text-red-600 hover:underline"
                >
                  {t("user_profil.lists.followed_muted_lists")}
                </Link>
              </li>
            </ul>
            <Separator />

            <DialogLogin>
              <Button
                className="sm:absolute m-2 hover:text-red-500 sm:right-0"
                variant="secondary"
                size="sm"
              >
                {t("user_profil.follow_button")}
              </Button>
            </DialogLogin>
          </div>
        ) : (
          <div
            className={`h-auto max-h-full min-h-full w-auto min-w-full max-w-full bg-gray-600 bg-cover`}
          />
        )}
      </div>
      <div className="flex flex-col pb-8 md:pb-4 ">
        <div className="w-full">
          <div
            className="flex h-12 bg-slate-800"
            data-testid="profile-navigation"
          >
            <div className="container mx-auto flex max-w-screen-xl justify-between p-0 sm:pl-8">
              <ul className="flex h-full gap-2 text-xs text-white sm:text-base lg:flex lg:gap-8">
                <li>
                  <Link
                    href={`/@${username}`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 
                    ${
                      router.asPath === `/@${username}`
                        ? "bg-white text-slate-800 dark:bg-slate-950  dark:text-slate-200  dark:hover:text-slate-200"
                        : ""
                    }
                    `}
                  >
                    {t("navigation.profil_navbar.blog")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/posts`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/posts` ||
                      router.asPath === `/@${username}/comments` ||
                      router.asPath === `/@${username}/payout`
                        ? "bg-white text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200  dark:text-slate-200 "
                        : ""
                    }`}
                  >
                    {t("navigation.profil_navbar.posts")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/replies`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/replies`
                        ? "bg-white text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200  dark:text-slate-200 "
                        : ""
                    }`}
                  >
                    {t("navigation.profil_navbar.replies")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/communities`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/communities`
                        ? "bg-white text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200  dark:text-slate-200 "
                        : ""
                    }`}
                  >
                    {t("navigation.profil_navbar.social")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/@${username}/notifications`}
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 ${
                      router.asPath === `/@${username}/notifications`
                        ? "bg-white text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200 dark:text-slate-200 "
                        : ""
                    }`}
                  >
                    {t("navigation.profil_navbar.notifications")}
                  </Link>
                </li>
              </ul>
              <ul className="flex h-full text-xs text-white sm:text-base lg:flex lg:gap-4">
                <li>
                  <Link
                    href={`http://localhost:4000/@${username}/transfers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full items-center px-2 hover:bg-white hover:text-slate-800 mr-4"
                  >
                    {t("navigation.profil_navbar.wallet")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <main className="container mx-auto max-w-screen-xl pt-4">
          {children}
        </main>
      </div>
    </div>) 
    :username&& !design?
   ( <div>
      <div
        className=' w-full bg-gray-600 text-sm leading-6 text-zinc-50 sm:h-fit'
        style={{ textShadow: 'rgb(0, 0, 0) 1px 1px 2px' }}
        data-testid='profile-info'
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
            <div className='mt-4 flex items-center'>
              <div
                className='mr-3 h-[48px] w-[48px] rounded-3xl bg-cover bg-no-repeat'
                style={{
                  backgroundImage: `url(https://images.hive.blog/u/${profileData?.name}/avatar)`
                }}
              />
              <h4 className='sm:text-2xl' data-testid='profile-name'>
                <span className='font-semibold'>
                  {profileData?.profile?.name
                    ? profileData.profile.name
                    : profileData.name}
                </span>{' '}
                <span
                  title={`This is ${username}s's reputation score.\n\nThe reputation score is based on the history of votes received by the account, and is used to hide low quality content.`}
                >
                  (
                  {accountReputation(
                    profileData.reputation ? profileData.reputation : 0
                  )}
                  )
                </span>
              </h4>
              <button onClick={()=>setDesign(!design)}>o</button>
              {profileData.name ? (
                <Link
                  href={`https://hivebuzz.me/@${profileData.name}`}
                  target='_blank'
                >
                  <img
                    alt='fish image'
                    title={t('user_profil.hive_buzz_badge_title', { username: profileData.name })}
                    className='mx-2 w-6 duration-500 ease-in-out hover:w-12'
                    src={`https://hivebuzz.me/api/level/${profileData.name}?dead`}
                  />
                </Link>
              ) : null}
              {twitterData ? (
                <Link
                  href={twitterData.twitter_profile}
                  title={t('user_profil.twitter_badge_title')}
                  target='_blank'
                >
                  <Icons.twitter fill='#1da1f2' className='text-blue-400' />
                </Link>
              ) : null}
            </div>

            <p
              className='my-1 max-w-[420px] text-center text-white sm:my-4'
              data-testid='profile-about'
            >
              {profileData?.profile?.about ? profileData?.profile?.about.slice(0, 157) + (157 < profileData?.profile?.about.length ? '...' : '') : null}
            </p>
            <ul
              className='my-1 flex h-5 gap-1 text-xs sm:text-sm'
              data-testid='profile-stats'
            >
              <li className='flex items-center gap-1'>
                <Link
                  href={`/@${profileData.name}/followers`}
                  className='hover:cursor-pointer hover:text-red-600 hover:underline'
                >
                  {profileData?.follow_stats?.follower_count === 0 || undefined
                    ? t('user_profil.lists.follower_count.zero')
                    : profileData?.follow_stats?.follower_count === 1
                      ? t('user_profil.lists.follower_count.one') :
                      t('user_profil.lists.follower_count.other', { value: profileData?.follow_stats?.follower_count })}
                </Link>
              </li>

              <li className='flex items-center
              gap-1'>
                {' '}
                <Separator orientation='vertical' className='bg-white' />
                <Link
                  className='hover:cursor-pointer hover:text-red-600 hover:underline'
                  href={`/@${profileData.name}`}
                >
                  {profileData?.post_count === 0
                    ? t('user_profil.lists.post_count.zero')
                    : profileData?.post_count === 1
                      ? t('user_profil.lists.post_count.one')
                      : t('user_profil.lists.post_count.other', { value: profileData?.post_count })}
                </Link>
              </li>

              <li className='flex items-center
              gap-1'>
                <Separator orientation='vertical' className='bg-white' />{' '}
                <Link
                  href={`/@${profileData.name}/followed`}
                  className='hover:cursor-pointer hover:text-red-600 hover:underline'
                >
                  {profileData?.follow_stats?.following_count === 0 || undefined
                    ? t('user_profil.lists.followed_count.zero')
                    : profileData?.follow_stats?.following_count === 1 ? t('user_profil.lists.followed_count.one') : t('user_profil.lists.followed_count.other', { value: profileData?.follow_stats?.following_count })}
                </Link>
              </li>

              <li className='flex items-center gap-1'>
                <Separator orientation='vertical' className='bg-white' />
                {numberWithCommas(hp.toFixed(0)) + ' HP'}
              </li>
            </ul>

            <ul className='my-1 flex flex-wrap justify-center gap-2 text-xs sm:text-sm'>
              <li className='flex items-center gap-1'>
                <Link
                  href={`/@${profileData?.name}/lists/blacklisted`}
                  className='hover:cursor-pointer hover:text-red-600 hover:underline'
                >
                  {t('user_profil.lists.blacklisted_users')}
                </Link>
              </li>

              <li className='flex items-center gap-1'>
                <Separator orientation='vertical' className='h-4 bg-white' />
                <Link
                  href={`/@${profileData?.name}/lists/muted`}
                  className='hover:cursor-pointer hover:text-red-600 hover:underline'
                >
                  {t('user_profil.lists.muted_users')}
                </Link>
              </li>

              <li className='flex items-center gap-1'>
                <Separator orientation='vertical' className='h-4 bg-white' />
                <Link
                  href={`/@${profileData?.name}/lists/followed_blacklists`}
                  className='hover:cursor-pointer hover:text-red-600 hover:underline'
                >
                  {t('user_profil.lists.followed_blacklists')}
                </Link>
              </li>

              <li className='flex items-center gap-1'>
                <Separator orientation='vertical' className='bg-white' />
                <Link
                  href={`/@${profileData?.name}/lists/followed_muted_lists`}
                  className='hover:cursor-pointer hover:text-red-600 hover:underline'
                >
                  {t('user_profil.lists.followed_muted_lists')}
                </Link>
              </li>
            </ul>

            <ul className='my-4 flex h-5 justify-center gap-1 text-xs text-white sm:gap-4 sm:text-sm'>
              {profileData?.profile?.location ? (
                <li className='flex items-center'>
                  <Icons.mapPin className='m-1' />
                  <span data-testid='user-location'>
                    {profileData?.profile?.location}
                  </span>
                </li>
              ) : null}
              {profileData?.profile?.website ? (
                <li className='flex items-center'>
                  <Icons.globe2 className='m-1' />
                  <Link
                    target='_external'
                    className='website-link break-words '
                    href={`https://${profileData?.profile?.website?.replace(
                      /^(https?|ftp):\/\//,
                      ''
                    )}`}
                  >
                    <span>{profileData?.profile?.website}</span>
                  </Link>
                </li>
              ) : null}
              <li className='flex items-center'>
                <Icons.calendarHeart className='m-1' />
                <span data-testid='user-joined'>
                {t('user_profil.joined')}{' '}
                  {profileData?.created
                    ? dateToShow(profileData.created, t)
                    : null}
                </span>
              </li>
              <li className='flex items-center'>
                <Icons.calendarActive className='m-1' />
                <span data-testid='user-last-time-active'>
                  {t('user_profil.active')}{' '}
                  {compareDates([
                    profileData.created,
                    profileData.last_vote_time,
                    profileData.last_post
                  ], t)}
                </span>
              </li>
            </ul>

            <DialogLogin>
              <Button
                className='sm:absolute m-2 hover:text-red-500 sm:right-0'
                variant='secondary'
                size='sm'
              >
                {t('user_profil.follow_button')}
              </Button>
            </DialogLogin>
          </div>
        ) : (
          <div
            className={`h-auto max-h-full min-h-full w-auto min-w-full max-w-full bg-gray-600 bg-cover`}
          />
        )}
      </div>
      <div className='flex flex-col pb-8 md:pb-4 '>
        <div className='w-full'>
          <div
            className='flex h-12 bg-slate-800'
            data-testid='profile-navigation'
          >
            <div className='container mx-auto flex max-w-screen-xl justify-between p-0 sm:pl-8'>
              <ul className='flex h-full gap-2 text-xs text-white sm:text-base lg:flex lg:gap-8'>
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
                        ? 'bg-white text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200  dark:text-slate-200 '
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
                        ? 'bg-white text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200  dark:text-slate-200 '
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
                        ? 'bg-white text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200  dark:text-slate-200 '
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
                        ? 'bg-white text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200 dark:text-slate-200 '
                        : ''
                    }`}
                  >
                    {t('navigation.profil_navbar.notifications')}
                  </Link>
                </li>
              </ul>
              <ul className='flex h-full text-xs text-white sm:text-base lg:flex lg:gap-4'>
                <li>
                  <Link
                    href={`http://localhost:4000/@${username}/transfers`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex h-full items-center px-2 hover:bg-white hover:text-slate-800 mr-4'
                  >
                    {t('navigation.profil_navbar.wallet')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <main className='container mx-auto max-w-screen-xl pt-4'>{children}</main>
      </div>
    </div>)

   : (
    <Loading loading={true} />
  );
};

export default ProfileLayout;
