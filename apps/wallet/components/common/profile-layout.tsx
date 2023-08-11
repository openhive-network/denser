import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSiteParams } from "@hive/ui/components/hooks/use-site-params";
import Loading from "@hive/ui/components/loading";
import { useQuery } from "@tanstack/react-query";
import { getAccountFull } from "@hive/ui/lib/hive";
import { Icons } from "@hive/ui/components/icons";
import { dateToShow } from "@hive/ui/lib/parse-date";
import { proxifyImageUrl } from "@hive/ui/lib/old-profixy";
import clsx from "clsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hive/ui/components/dropdown-menu";

interface IProfileLayout {
  children: React.ReactNode;
}

const ProfileLayout = ({ children }: IProfileLayout) => {
  const router = useRouter();
  const { username } = useSiteParams();
  const {
    isLoading: profileDataIsLoading,
    error: errorProfileData,
    data: profileData,
  } = useQuery(["profileData", username], () => getAccountFull(username), {
    enabled: !!username,
  });

  if (profileDataIsLoading || !profileData) {
    return <Loading loading={profileDataIsLoading} />;
  }

  return username ? (
    <div>
      <div
        className=" w-full bg-gray-600 text-sm leading-6 text-zinc-50 sm:h-fit"
        style={{ textShadow: "rgb(0, 0, 0) 1px 1px 2px" }}
        data-testid="profile-info"
      >
        {profileData?.posting_json_metadata ? (
          <div
            style={{
              background: JSON.parse(profileData?.posting_json_metadata).profile
                .cover_image
                ? `url('${proxifyImageUrl(
                    JSON.parse(profileData?.posting_json_metadata).profile
                      .cover_image,
                    "2048x512"
                  ).replace(/ /g, "%20")}') center center no-repeat`
                : "",

              backgroundSize: "cover",
            }}
            className={`flex h-auto max-h-full min-h-full w-auto min-w-full max-w-full flex-col items-center`}
          >
            <div className="mt-4 flex items-center">
              <div
                className="mr-3 h-[48px] w-[48px] rounded-3xl bg-cover bg-no-repeat"
                style={{
                  backgroundImage: `url(https://images.hive.blog/u/${profileData?.name}/avatar)`,
                }}
              />
              <h4 className="sm:text-2xl" data-testid="profile-name">
                <span className="font-semibold">
                  {profileData?.profile?.name
                    ? profileData.profile.name
                    : profileData.name}
                </span>{" "}
              </h4>
            </div>

            <p
              className="my-1 max-w-[420px] text-center text-white sm:my-4"
              data-testid="profile-about"
            >
              {profileData?.profile?.about}
            </p>

            <ul className="my-4 flex h-5 justify-center gap-1 text-xs text-white sm:gap-4 sm:text-sm">
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
                  Joined{" "}
                  {profileData?.created
                    ? dateToShow(profileData.created)
                    : null}
                </span>
              </li>
            </ul>
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
            <div className="container mx-auto flex max-w-screen-xl justify-between justify-between p-0 sm:pl-8">
              <ul className="flex h-full gap-2 text-xs text-white sm:text-base lg:flex lg:gap-8">
                <li>
                  <Link
                    href={`http://localhost:3000/@${username}`}
                    target="_blank"
                    className={`flex h-full items-center px-2 hover:bg-white hover:text-slate-800 
                    ${
                      router.asPath === `/@${username}`
                        ? "bg-white text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200"
                        : ""
                    }
                    `}
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex h-full items-center px-2 hover:bg-white hover:text-slate-800 cursor-pointer">
                        Rewards <span className="m-1 rotate-180">^</span>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuItem>
                        <span>Curation rewards</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <span>Author rewards</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              </ul>
              <ul className="flex h-full text-xs text-white sm:text-base lg:flex lg:gap-4">
                <li>
                  <Link
                    href={`http://localhost:4000/@${username}/transfers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={clsx(
                      "flex h-full items-center px-2 hover:bg-white hover:text-slate-800 mr-4",
                      router.asPath === `/@${username}/transfers` ||
                        router.asPath === `/@${username}/delegations`
                        ? "bg-white dark:text-slate-200 text-slate-800 dark:bg-slate-950 dark:hover:text-slate-200"
                        : ""
                    )}
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
