"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStorageWithTTL } from "@ui/hooks/useStorageWithTTL";
import { StorageTTL, getItemsByPrefix, removeStorageItem } from "@ui/lib/storage-with-ttl";
import { Entry } from "@hive/common-hiveio-packages/wax";
import { DEFAULT_PREFERENCES, Preferences } from "@/blog/lib/utils";
import { useTranslation } from "@/blog/i18n/client";
import { AccountFormValues, createAccountFormSchema } from "@/blog/features/post-editor/types";

interface UsePostFormStateParams {
  username: string;
  editMode: boolean;
  post_s?: Entry;
  categoryParam?: string;
}

export function usePostFormState({ username, editMode, post_s, categoryParam }: UsePostFormStateParams) {
  const { t } = useTranslation("common_blog");
  const [preferences] = useStorageWithTTL<Preferences>(
    `user-preferences-${username}`,
    DEFAULT_PREFERENCES,
    StorageTTL.PERMANENT
  );

  const defaultValues: AccountFormValues = {
    title: "",
    postArea: "",
    postSummary: "",
    tags: "",
    author: "",
    category: "blog",
    beneficiaries: [],
    maxAcceptedPayout: preferences.blog_rewards === "0%" ? 0 : 1000000,
    payoutType: preferences.blog_rewards,
  };

  const [storedPost, storePost, removePost] = useStorageWithTTL<AccountFormValues>(
    editMode ? `postData-edit-${post_s?.permlink}` : `postData-new-${username}`,
    defaultValues,
    StorageTTL.DRAFT
  );

  // Check if we have a draft with actual changes (different from original post)
  const hasDraftChanges =
    editMode &&
    storedPost &&
    ((storedPost.postArea && storedPost.postArea !== post_s?.body) ||
      (storedPost.title && storedPost.title !== post_s?.title));

  // In edit mode: use draft if it has changes, otherwise use original post
  // In new mode: use draft if available
  const entryValues: AccountFormValues = {
    title: hasDraftChanges
      ? storedPost?.title || post_s?.title || ""
      : post_s?.title || storedPost?.title || "",
    postArea: hasDraftChanges
      ? storedPost?.postArea || post_s?.body || ""
      : post_s?.body || storedPost?.postArea || "",
    postSummary: hasDraftChanges
      ? storedPost?.postSummary || post_s?.json_metadata?.summary || ""
      : post_s?.json_metadata?.summary || storedPost?.postSummary || "",
    tags: hasDraftChanges
      ? storedPost?.tags ||
        (Array.isArray(post_s?.json_metadata?.tags) ? post_s.json_metadata.tags.join(" ") : "") ||
        ""
      : (Array.isArray(post_s?.json_metadata?.tags) ? post_s.json_metadata.tags.join(" ") : "") ||
        storedPost?.tags ||
        "",
    author: hasDraftChanges
      ? storedPost?.author || post_s?.json_metadata?.author || ""
      : post_s?.json_metadata?.author || storedPost?.author || "",
    category: editMode
      ? (post_s?.category ?? categoryParam ?? "")
      : (categoryParam ?? storedPost?.category ?? post_s?.category ?? ""),
    beneficiaries: storedPost?.beneficiaries || [],
    maxAcceptedPayout: post_s
      ? Number(post_s.max_accepted_payout.split(" ")[0])
      : (storedPost?.maxAcceptedPayout ?? (preferences.blog_rewards === "0%" ? 0 : 1000000)),
    payoutType: post_s
      ? parseFloat(post_s.max_accepted_payout) === 0
        ? "0%"
        : post_s.percent_hbd === 0
          ? "100%"
          : "50%"
      : storedPost?.payoutType || preferences.blog_rewards,
  };

  const accountFormSchema = createAccountFormSchema(t);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: entryValues,
  });

  // Track if we've hydrated from localStorage to avoid resetting form during typing
  const hasHydratedRef = useRef(false);
  // Track if post was successfully submitted to prevent auto-save from re-creating draft
  const hasSubmittedRef = useRef(false);

  const [previewContent, setPreviewContent] = useState<string | undefined>(storedPost.postArea);

  // Shadow draft recovery — scan for orphaned shadow drafts from crashed sessions
  const [shadowDraftRecovery, setShadowDraftRecovery] = useState<{
    key: string;
    value: { title: string; body: string; tags: string[]; category: string; summary: string };
  } | null>(null);

  useEffect(() => {
    if (editMode || !username) return;

    const shadowDrafts = getItemsByPrefix<{
      title: string;
      body: string;
      tags: string[];
      category: string;
      summary: string;
    }>(`shadow-post-${username}-`);

    if (shadowDrafts.length > 0) {
      setShadowDraftRecovery(shadowDrafts[0]);
    }
  }, [username, editMode]);

  // Hydrate form from localStorage after initial render
  useEffect(() => {
    if (hasHydratedRef.current) return;

    const hasStoredData = storedPost.postArea || storedPost.title || storedPost.tags;
    const shouldHydrate = editMode ? hasDraftChanges : hasStoredData;

    if (shouldHydrate) {
      form.reset({
        ...entryValues,
        title: storedPost.title || entryValues.title,
        postArea: storedPost.postArea || entryValues.postArea,
        postSummary: storedPost.postSummary || entryValues.postSummary,
        tags: storedPost.tags || entryValues.tags,
        author: storedPost.author || entryValues.author,
        category: editMode ? entryValues.category : storedPost.category || entryValues.category,
        beneficiaries: storedPost.beneficiaries || entryValues.beneficiaries,
        maxAcceptedPayout: storedPost.maxAcceptedPayout ?? entryValues.maxAcceptedPayout,
        payoutType: storedPost.payoutType || entryValues.payoutType,
      });
      setPreviewContent(storedPost.postArea);
    }
    hasHydratedRef.current = true;
  }, [storedPost, editMode, hasDraftChanges]);

  // useWatch provides reactive values that update on every form change
  const formValues = useWatch({
    control: form.control,
  });

  // Memoize beneficiaries separately
  const beneficiaries = useMemo(
    () =>
      (formValues.beneficiaries ?? []).map((b) => ({
        account: b.account ?? "",
        weight: b.weight ?? "",
      })),
    [formValues.beneficiaries]
  );

  // Memoize other form values with granular dependencies
  const watchedValues = useMemo(
    () => ({
      title: formValues.title ?? "",
      postArea: formValues.postArea ?? "",
      postSummary: formValues.postSummary ?? "",
      tags: formValues.tags ?? "",
      author: formValues.author ?? "",
      category: formValues.category ?? "blog",
      beneficiaries,
      maxAcceptedPayout: formValues.maxAcceptedPayout ?? 1000000,
      payoutType: formValues.payoutType ?? "50%",
    }),
    [
      formValues.title,
      formValues.postArea,
      formValues.postSummary,
      formValues.tags,
      formValues.author,
      formValues.category,
      beneficiaries,
      formValues.maxAcceptedPayout,
      formValues.payoutType,
    ]
  );

  return {
    form,
    defaultValues,
    storedPost,
    storePost,
    removePost,
    entryValues,
    hasDraftChanges,
    hasHydratedRef,
    hasSubmittedRef,
    watchedValues,
    previewContent,
    setPreviewContent,
    shadowDraftRecovery,
    setShadowDraftRecovery,
    removeShadowDraft: (key: string) => {
      removeStorageItem(key);
      setShadowDraftRecovery(null);
    },
  };
}
