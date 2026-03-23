"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserClient } from "@smart-signer/lib/auth/use-user-client";
import { getFollowList } from "@transaction/lib/bridge-api";
import { useFollowMutedBlogMutation } from "@/blog/components/hooks/use-follow-muted-list-mutation";
import { useTranslation } from "@/blog/i18n/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/components/popover";
import { Button } from "@ui/components/button";

const COOKIE_NAME = "muted_list_alert_dismissed";
const MUTED_LIST_ACCOUNT = "hive.blog";
const COOKIE_MAX_AGE = 31536000; // 1 year in seconds

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

const MutedListWarning = () => {
  const { t } = useTranslation("common_blog");
  const { user } = useUserClient();
  const followMutedMutation = useFollowMutedBlogMutation();

  const [dismissed, setDismissed] = useState(
    () => getCookie(COOKIE_NAME) === "1"
  );
  const [open, setOpen] = useState(false);

  const { data: followMutedList, isLoading } = useQuery({
    queryKey: ["follow_muted", user.username],
    queryFn: () => getFollowList(user.username, "follow_muted"),
    enabled: !!user.username && !dismissed,
  });

  if (
    dismissed ||
    !user.isLoggedIn ||
    isLoading ||
    !followMutedList ||
    followMutedList.length > 0
  ) {
    return null;
  }

  const handleFollowMutedList = () => {
    followMutedMutation.mutate(
      { otherBlogs: MUTED_LIST_ACCOUNT },
      {
        onSuccess: () => {
          setCookie(COOKIE_NAME, "1", COOKIE_MAX_AGE);
          setDismissed(true);
          setOpen(false);
        },
      }
    );
  };

  const handleDismiss = () => {
    setCookie(COOKIE_NAME, "1", COOKIE_MAX_AGE);
    setDismissed(true);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="absolute bottom-auto left-0 top-0.5 z-[60] inline-block -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive-icon px-2 py-1 text-center text-xs font-bold leading-none text-white"
          data-testid="muted-list-warning-trigger"
        >
          !
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {t("muted_list_warning.description", {
              account: MUTED_LIST_ACCOUNT,
            })}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={handleFollowMutedList}
              disabled={followMutedMutation.isPending}
            >
              {followMutedMutation.isPending
                ? t("global.loading")
                : t("muted_list_warning.follow_button", {
                    account: MUTED_LIST_ACCOUNT,
                  })}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
            >
              {t("muted_list_warning.dismiss_button")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MutedListWarning;
