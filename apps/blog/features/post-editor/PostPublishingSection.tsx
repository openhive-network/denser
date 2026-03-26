"use client";

import { UseFormReturn } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hive/ui/components/select";
import { FormControl, FormField, FormItem } from "@hive/ui/components/form";
import { Progress } from "@ui/components/progress";
import { withBasePath } from "@ui/lib/path-utils";
import { isCommunity } from "@ui/lib/utils";
import { DEFAULT_OBSERVER } from "@/blog/lib/utils";
import { getCommunity, getSubscriptions } from "@transaction/lib/bridge-api";
import { useTranslation } from "@/blog/i18n/client";
import { AdvancedSettingsPostForm } from "@/blog/features/post-editor/advanced-settings-post-form";
import { useLoggedUserContext } from "@/blog/features/votes/hooks/use-logged-user";
import { Entry } from "@hive/common-hiveio-packages/wax";
import { AccountFormValues } from "@/blog/features/post-editor/types";

interface PostPublishingSectionProps {
  form: UseFormReturn<AccountFormValues>;
  username: string;
  observer: string;
  editMode: boolean;
  post_s?: Entry;
  watchedValues: AccountFormValues;
  storedPost: AccountFormValues;
  storePost: (value: AccountFormValues) => void;
  categoryParam?: string;
  handleLoadTemplate: (data: AccountFormValues) => void;
}

export function PostPublishingSection({
  form,
  username,
  observer,
  editMode,
  post_s,
  watchedValues,
  storedPost,
  storePost,
  categoryParam,
  handleLoadTemplate,
}: PostPublishingSectionProps) {
  const { t } = useTranslation("common_blog");
  const router = useRouter();
  const { manabarsData } = useLoggedUserContext();

  const { data: communityData } = useQuery({
    queryKey: ["community", categoryParam, observer],
    queryFn: () => getCommunity(categoryParam ?? storedPost.category, observer),
    enabled: isCommunity(categoryParam) || isCommunity(storedPost.category),
  });

  const { data: mySubsData } = useQuery({
    queryKey: ["subscriptions", observer],
    queryFn: () => getSubscriptions(observer),
    enabled: observer !== DEFAULT_OBSERVER,
  });

  const communityPosting =
    mySubsData && mySubsData?.filter((e) => e[0] === categoryParam).length > 0
      ? mySubsData?.filter((e) => e[0] === categoryParam)[0][0]
      : undefined;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-secondary/30 p-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("submit_page.publishing_section")}
      </span>

      {!editMode ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("submit_page.post_options")}</span>

          {watchedValues.maxAcceptedPayout < 1000000 && watchedValues.maxAcceptedPayout > 0 ? (
            <span className="text-xs text-muted-foreground">
              {t("submit_page.advanced_settings_dialog.maximum_accepted_payout")}:{" "}
              {watchedValues.maxAcceptedPayout} HBD
            </span>
          ) : null}

          {watchedValues.beneficiaries.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {t("submit_page.advanced_settings_dialog.beneficiaries", {
                num: watchedValues.beneficiaries.length,
              })}
            </span>
          ) : null}

          <span className="text-xs text-muted-foreground" data-testid="author-rewards-description">
            {t("submit_page.author_rewards")}
            {watchedValues.maxAcceptedPayout === 0
              ? ` ${t("submit_page.advanced_settings_dialog.decline_payout")}`
              : watchedValues.payoutType === "100%"
                ? t("submit_page.power_up")
                : " 50% HBD / 50% HP"}
          </span>
          <AdvancedSettingsPostForm
            username={username}
            updateForm={(e) => handleLoadTemplate(e)}
            data={watchedValues}
          >
            <span
              className="w-fit cursor-pointer text-xs text-destructive hover:underline"
              title={t("submit_page.advanced_tooltip")}
              data-testid="advanced-settings-button"
            >
              {t("submit_page.advanced_settings")}
            </span>
          </AdvancedSettingsPostForm>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("submit_page.author_rewards")}</span>
          {post_s && parseFloat(post_s.max_accepted_payout) === 0 ? (
            <span className="text-xs text-muted-foreground">
              {t("submit_page.reward_options_final")}
            </span>
          ) : (
            <>
              <FormField
                control={form.control}
                name="payoutType"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === "0%") {
                            form.setValue("maxAcceptedPayout", 0);
                          } else if (watchedValues.maxAcceptedPayout === 0) {
                            form.setValue(
                              "maxAcceptedPayout",
                              post_s ? Number(post_s.max_accepted_payout.split(" ")[0]) : 1000000
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-[180px]" data-testid="edit-reward-type-select">
                          <SelectValue>
                            {field.value === "50%" && "50% HBD / 50% HP"}
                            {field.value === "100%" && t("submit_page.power_up")}
                            {field.value === "0%" &&
                              t("submit_page.advanced_settings_dialog.decline_payout")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {post_s && post_s.percent_hbd === 10000 && (
                            <SelectItem value="50%">50% HBD / 50% HP</SelectItem>
                          )}
                          {post_s && post_s.percent_hbd >= 0 && (
                            <SelectItem value="100%">{t("submit_page.power_up")}</SelectItem>
                          )}
                          {(!post_s || post_s.net_rshares <= 0) && (
                            <SelectItem value="0%">
                              {t("submit_page.advanced_settings_dialog.decline_payout")}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <span className="text-xs text-muted-foreground">
                {t("submit_page.reward_options_restrictive")}
              </span>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("submit_page.account_stats")}</span>
        <div className="flex items-center gap-3">
          <Progress
            value={manabarsData?.rc.percentageValue ?? 0}
            className="h-2 flex-1"
            indicatorClassName="bg-[#0088FE]"
          />
          <span
            className="text-xs tabular-nums text-muted-foreground"
            data-testid="resource-credits-description"
          >
            {manabarsData?.rc.percentageValue ?? 0}% RC
          </span>
        </div>
      </div>

      {!editMode ? (
        <FormField
          control={form.control}
          name="category"
          render={() => (
            <FormItem>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted-foreground">{t("submit_page.posting_to")}</span>
                <FormControl>
                  <Select
                    value={
                      communityPosting
                        ? communityPosting
                        : storedPost?.category
                          ? storedPost.category
                          : "blog"
                    }
                    onValueChange={(e) => {
                      form.setValue("category", e);
                      storePost({ ...storedPost, category: e });
                      if (categoryParam) {
                        router.replace(withBasePath("/submit.html"));
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="w-auto min-w-[140px]"
                        data-testid="posting-to-list-trigger"
                      >
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="blog">{t("submit_page.my_blog")}</SelectItem>
                      <SelectGroup className="py-2 ml-2">
                        {t("submit_page.my_communities")}
                      </SelectGroup>
                      {mySubsData?.map((e) => (
                        <SelectItem key={e[0]} value={e[0]}>
                          {e[1]}
                        </SelectItem>
                      ))}
                      {!mySubsData?.some((e) => e[0] === storedPost.category) &&
                      storedPost.category !== "blog" ? (
                        <>
                          <SelectGroup>{t("submit_page.others_communities")}</SelectGroup>
                          <SelectItem value={communityData?.name ?? storedPost.category}>
                            {communityData?.title}
                          </SelectItem>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                </FormControl>
              </div>
            </FormItem>
          )}
        />
      ) : null}
    </div>
  );
}
