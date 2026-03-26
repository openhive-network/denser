"use client";

import clsx from "clsx";
import { UseFormReturn } from "react-hook-form";
import { Badge } from "@hive/ui/components/badge";
import { Input } from "@hive/ui/components/input";
import { FormControl, FormField, FormItem, FormMessage } from "@hive/ui/components/form";
import { Icons } from "@ui/components/icons";
import { useTranslation } from "@/blog/i18n/client";
import {
  validateTagInput,
  validateSummaryInput,
  validateAltUsernameInput,
  parseTags,
  MAX_TAGS,
} from "@/blog/features/post-editor/lib/utils";
import SelectImageList from "@/blog/features/post-editor/select-image-list";
import { AccountFormValues } from "@/blog/features/post-editor/types";

interface PostMetadataSectionProps {
  form: UseFormReturn<AccountFormValues>;
  watchedValues: AccountFormValues;
  postArea: string;
  selectedImg: string;
  setSelectedImg: (img: string) => void;
  proxyAuthToken: string | undefined;
  categoryParam?: string;
}

export function PostMetadataSection({
  form,
  watchedValues,
  postArea,
  selectedImg,
  setSelectedImg,
  proxyAuthToken,
  categoryParam,
}: PostMetadataSectionProps) {
  const { t } = useTranslation("common_blog");

  const tagsRequired = !categoryParam && watchedValues.category === "blog";
  const tagsCheck = validateTagInput(watchedValues.tags, tagsRequired, t);
  const summaryCheck = validateSummaryInput(watchedValues.postSummary, t);
  const altUsernameCheck = validateAltUsernameInput(watchedValues.author, t);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-secondary/30 p-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("submit_page.metadata_section")}
      </span>

      <FormField
        control={form.control}
        name="postSummary"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="relative">
                <Input
                  placeholder={t("submit_page.post_summary")}
                  className={clsx("pr-16 bg-background", {
                    "border-red-500 focus-visible:ring-red-500": summaryCheck,
                  })}
                  {...field}
                />
                <span
                  className={clsx(
                    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums",
                    field.value.length > 140 ? "text-red-500" : "text-muted-foreground"
                  )}
                >
                  {field.value.length}/140
                </span>
              </div>
            </FormControl>
            <div className="text-xs text-destructive">{summaryCheck}</div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="relative">
                <Input
                  placeholder={t("submit_page.enter_your_tags")}
                  className={clsx("pr-12 bg-background", {
                    "border-red-500 focus-visible:ring-red-500": tagsCheck,
                  })}
                  {...field}
                  onChange={(e) => {
                    const normalized = e.target.value.replace(/,/g, " ");
                    field.onChange(normalized);
                  }}
                />
                {parseTags(field.value).length > 0 && (
                  <span
                    className={clsx(
                      "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums",
                      parseTags(field.value).length > MAX_TAGS ? "text-red-500" : "text-muted-foreground"
                    )}
                  >
                    {parseTags(field.value).length}/{MAX_TAGS}
                  </span>
                )}
              </div>
            </FormControl>
            {parseTags(field.value).length > 0 && (
              <div className="flex flex-wrap gap-1.5" data-testid="tag-chips">
                {parseTags(field.value).map((tag, index) => (
                  <Badge
                    key={`${tag}-${index}`}
                    variant="secondary"
                    className="cursor-pointer gap-1 pr-1 text-xs font-normal transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      const tags = parseTags(field.value);
                      tags.splice(index, 1);
                      form.setValue("tags", tags.join(" "));
                    }}
                  >
                    {tag}
                    <Icons.x className="h-3 w-3 opacity-60 hover:opacity-100" />
                  </Badge>
                ))}
              </div>
            )}
            <div className="text-xs text-destructive">{tagsCheck}</div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="author"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                placeholder={t("submit_page.author_if_different")}
                className={clsx("bg-background", {
                  "border-red-500 focus-visible:ring-red-500": altUsernameCheck,
                })}
                {...field}
              />
            </FormControl>
            <div className="text-xs text-red-500">{altUsernameCheck}</div>
            <FormMessage />
          </FormItem>
        )}
      />

      <SelectImageList
        content={postArea}
        value={selectedImg}
        onChange={setSelectedImg}
        proxyAuthToken={proxyAuthToken}
      />
    </div>
  );
}
