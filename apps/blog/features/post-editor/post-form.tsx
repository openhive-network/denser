"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { Input } from "@hive/ui/components/input";
import { Button } from "@hive/ui/components/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@hive/ui/components/form";
import { Icons } from "@ui/components/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui/components/tooltip";
import { Separator } from "@ui/components";
import { CircleSpinner } from "react-spinners-kit";
import { Entry } from "@hive/common-hiveio-packages/wax";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { getCommunity } from "@transaction/lib/bridge-api";
import { DEFAULT_OBSERVER } from "@/blog/lib/utils";
import { getLogger } from "@ui/lib/logging";
import { configuredImagesEndpoint } from "@ui/config/public-vars";
import { isCommunity } from "@ui/lib/utils";
import { useTranslation } from "@/blog/i18n/client";
import { useUserClient } from "@smart-signer/lib/auth/use-user-client";
import { useSignerContext } from "@smart-signer/components/signer-provider";
import { useLoggedUserContext } from "@/blog/features/votes/hooks/use-logged-user";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@hive/ui/components/alert-dialog";
import dynamic from "next/dynamic";
import { imagePicker, validateTagInput, validateSummaryInput, validateAltUsernameInput } from "@/blog/features/post-editor/lib/utils";
import { usePostFormState } from "@/blog/features/post-editor/hooks/use-post-form-state";
import { usePostFormActions } from "@/blog/features/post-editor/hooks/use-post-form-actions";
import { useScrollSync } from "@/blog/features/post-editor/hooks/use-scroll-sync";
import { PostFormHeader } from "@/blog/features/post-editor/PostFormHeader";
import { PostMetadataSection } from "@/blog/features/post-editor/PostMetadataSection";
import { PostPublishingSection } from "@/blog/features/post-editor/PostPublishingSection";
import { PostPreviewPanel } from "@/blog/features/post-editor/PostPreviewPanel";

const MdEditor = dynamic(() => import("@/blog/features/post-editor/md-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-md border border-border bg-background-secondary/30">
      <CircleSpinner loading size={24} color="#dc2626" />
    </div>
  ),
});

const logger = getLogger("app");

/** Check if markdown content contains external image URLs that would need proxying. */
function contentHasExternalImage(content: string, proxyBase: string): boolean {
  const mdImageRegex = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
  let match;
  while ((match = mdImageRegex.exec(content)) !== null) {
    if (!match[1].startsWith(proxyBase)) return true;
  }
  const bareImageRegex =
    /(?:^|\n)\s*(https?:\/\/[^\s]+\.(?:jpe?g|png|gif|webp|svg|bmp)(?:\?[^\s]*)?)\s*(?:\n|$)/gi;
  while ((match = bareImageRegex.exec(content)) !== null) {
    if (!match[1].startsWith(proxyBase)) return true;
  }
  const htmlImgRegex = /<img\s[^>]*src=["'](https?:\/\/[^"']+)["']/gi;
  while ((match = htmlImgRegex.exec(content)) !== null) {
    if (!match[1].startsWith(proxyBase)) return true;
  }
  return false;
}

export default function PostForm({
  username,
  editMode = false,
  sideBySidePreview = true,
  post_s,
  setEditMode,
  refreshPage,
  setIsSubmitting,
}: {
  username: string;
  editMode: boolean;
  sideBySidePreview: boolean;
  post_s?: Entry;
  setEditMode?: Dispatch<SetStateAction<boolean>>;
  refreshPage?: () => void;
  setIsSubmitting: (submitting: boolean) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { user } = useUserClient();
  const { signer } = useSignerContext();
  const observer = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get("category") ?? undefined;
  const { t } = useTranslation("common_blog");
  const { reputation } = useLoggedUserContext();

  const [preview, setPreview] = useState(true);
  const [selectedImg, setSelectedImg] = useState(
    editMode && post_s?.json_metadata?.image?.[0] ? post_s.json_metadata.image[0] : ""
  );
  const [sideBySide, setSideBySide] = useState(sideBySidePreview);
  const [syncScroll, setSyncScroll] = useState(true);
  const isLgScreen = useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia("(min-width: 1024px)");
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false
  );
  const effectiveSideBySide = sideBySide && isLgScreen;
  const [imagePickerState, setImagePickerState] = useState("");
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [proxyAuthToken, setProxyAuthToken] = useState<string | undefined>();
  const proxyAuthRequested = useRef(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // --- State hook ---
  const {
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
    removeShadowDraft,
  } = usePostFormState({ username, editMode, post_s, categoryParam });

  // --- Actions hook ---
  const {
    postMutation,
    handlePostAreaChange,
    onSubmit,
    handleCancel,
    handleCancelConfirm,
    handleLoadTemplate,
  } = usePostFormActions({
    form,
    username,
    editMode,
    post_s,
    selectedImg,
    reputation,
    defaultValues,
    watchedValues,
    storedPost,
    storePost,
    removePost,
    hasHydratedRef,
    hasSubmittedRef,
    previewContent,
    setPreviewContent,
    setEditMode,
    refreshPage,
    setIsSubmitting,
    setCancelDialogOpen,
    btnRef,
  });

  // --- Scroll sync hook ---
  useScrollSync({
    editorContainerRef,
    previewContainerRef,
    syncScroll,
    effectiveSideBySide,
    preview,
    previewContent,
  });

  // --- Proxy auth token ---
  const fetchProxyAuthToken = useCallback(async () => {
    if (!user.isLoggedIn || !signer) {
      proxyAuthRequested.current = false;
      return;
    }
    try {
      const timestamp = Date.now();
      const imageOwner = signer.authorityUsername || signer.username;
      const message = `Authorize image proxy preview for ${imageOwner} at ${new Date(timestamp).toISOString()}`;
      const sig = await signer.signChallenge({ message, password: "" });
      const baseUrl = configuredImagesEndpoint.replace(/\/+$/, "");
      const resp = await fetch(`${baseUrl}/proxy-auth/${imageOwner}/${sig}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setProxyAuthToken(data.token);
      } else {
        logger.error("Failed to obtain proxy auth token: %s", resp.status);
      }
    } catch (error) {
      logger.error("Error obtaining proxy auth token: %o", error);
    }
  }, [user.isLoggedIn, signer]);

  useEffect(() => {
    if (proxyAuthRequested.current || !previewContent) return;
    if (contentHasExternalImage(previewContent, configuredImagesEndpoint)) {
      proxyAuthRequested.current = true;
      fetchProxyAuthToken();
    }
  }, [previewContent, fetchProxyAuthToken]);

  useEffect(() => {
    if (!proxyAuthToken) return;
    const interval = setInterval(fetchProxyAuthToken, 25 * 60 * 1000);
    return () => clearInterval(interval);
  }, [proxyAuthToken, fetchProxyAuthToken]);

  // --- NSFW tag injection ---
  const { data: communityData } = useQuery({
    queryKey: ["community", categoryParam, observer],
    queryFn: () => getCommunity(categoryParam ?? storedPost.category, observer),
    enabled: isCommunity(categoryParam) || isCommunity(storedPost.category),
  });
  const nsfwTagCheck = communityData?.is_nsfw && !storedPost.tags?.includes("nsfw");
  useEffect(() => {
    form.setValue("tags", nsfwTagCheck ? `nsfw ${entryValues.tags}` : entryValues.tags);
  }, [!!communityData?.is_nsfw]);

  useEffect(() => {
    setImagePickerState(imagePicker(selectedImg));
  }, [selectedImg]);

  // --- Validation checks for submit button ---
  const tagsRequired = !categoryParam && watchedValues.category === "blog";
  const tagsCheck = validateTagInput(watchedValues.tags, tagsRequired, t);
  const summaryCheck = validateSummaryInput(watchedValues.postSummary, t);
  const altUsernameCheck = validateAltUsernameInput(watchedValues.author, t);
  const tagsRequiredAndEmpty = tagsRequired && (!watchedValues.tags || !watchedValues.tags.trim());

  const { postArea } = watchedValues;

  return (
    <div className={clsx({ container: !sideBySide || !preview })}>
      <div
        className={clsx("relative flex flex-col gap-4 bg-background p-4 sm:p-6 lg:p-8", {
          "lg:flex-row": sideBySide,
        })}
        data-testid="form-and-preview-container"
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={clsx("flex flex-col gap-6 lg:w-1/2", {
              "lg:w-full": !preview || !sideBySide,
            })}
            data-testid="form-container"
          >
            <PostFormHeader
              sideBySide={sideBySide}
              setSideBySide={setSideBySide}
              preview={preview}
              setPreview={setPreview}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t("submit_page.title")}
                      className="h-12 border-0 border-b border-border bg-transparent px-1 text-lg font-semibold placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-destructive rounded-none"
                      {...field}
                      data-testid="post-title-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postArea"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div ref={editorContainerRef}>
                      <MdEditor
                        windowheight={500}
                        onChange={handlePostAreaChange}
                        persistedValue={field.value}
                      />
                    </div>
                  </FormControl>
                  <div className="flex items-center rounded-b-md border-x border-b border-border bg-background-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
                    {t("submit_page.insert_images_by_dragging")} {t("submit_page.selecting_them")}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger type="button" tabIndex={-1}>
                          <Icons.info className="ml-1 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>{t("submit_page.insert_images_info")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />

            <PostMetadataSection
              form={form}
              watchedValues={watchedValues}
              postArea={postArea}
              selectedImg={selectedImg}
              setSelectedImg={setSelectedImg}
              proxyAuthToken={proxyAuthToken}
              categoryParam={categoryParam}
            />

            <PostPublishingSection
              form={form}
              username={username}
              observer={observer}
              editMode={editMode}
              post_s={post_s}
              watchedValues={watchedValues}
              storedPost={storedPost}
              storePost={storePost}
              categoryParam={categoryParam}
              handleLoadTemplate={handleLoadTemplate}
            />

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-3">
                <Button
                  ref={btnRef}
                  type="submit"
                  variant="redHover"
                  className="w-28"
                  disabled={
                    !storedPost?.title ||
                    !storedPost?.postArea ||
                    Boolean(tagsCheck) ||
                    Boolean(summaryCheck) ||
                    Boolean(altUsernameCheck) ||
                    postMutation.isPending
                  }
                  data-testid="submit-post-button"
                >
                  {postMutation.isPending ? (
                    <CircleSpinner loading={postMutation.isPending} size={18} color="#dc2626" />
                  ) : (
                    t("submit_page.submit")
                  )}
                </Button>
                <Button
                  disabled={postMutation.isPending}
                  onClick={() => handleCancel()}
                  type="reset"
                  variant="ghost"
                  className="text-foreground/60 hover:text-destructive"
                  data-testid="clean-post-button"
                >
                  {editMode ? t("submit_page.cancel") : t("submit_page.clean")}
                </Button>
              </div>
              {!postMutation.isPending &&
                (!storedPost?.title || !storedPost?.postArea || tagsRequiredAndEmpty) && (
                  <p
                    className="text-xs text-muted-foreground"
                    data-testid="submit-requirements-hint"
                  >
                    {!storedPost?.title && !storedPost?.postArea
                      ? t("submit_page.enter_title_and_content")
                      : !storedPost?.title
                        ? t("submit_page.enter_title")
                        : !storedPost?.postArea
                          ? t("submit_page.enter_content")
                          : t("submit_page.enter_tags")}
                  </p>
                )}
            </div>
          </form>
        </Form>

        <PostPreviewPanel
          preview={preview}
          sideBySide={sideBySide}
          syncScroll={syncScroll}
          setSyncScroll={setSyncScroll}
          previewContainerRef={previewContainerRef}
          previewContent={previewContent}
          proxyAuthToken={proxyAuthToken}
        />
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editMode ? t("post_content.close_post_editor") : t("submit_page.clean_post_editor")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("submit_page.cancel_confirmation_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("submit_page.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("submit_page.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!shadowDraftRecovery} onOpenChange={(open) => {
        if (!open && shadowDraftRecovery) {
          removeShadowDraft(shadowDraftRecovery.key);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("submit_page.shadow_draft_found")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("submit_page.shadow_draft_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (shadowDraftRecovery) removeShadowDraft(shadowDraftRecovery.key);
            }}>
              {t("submit_page.shadow_draft_discard")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (shadowDraftRecovery) {
                const { value, key } = shadowDraftRecovery;
                form.reset({
                  ...defaultValues,
                  title: value.title,
                  postArea: value.body,
                  tags: value.tags.join(" "),
                  category: value.category,
                  postSummary: value.summary,
                });
                setPreviewContent(value.body);
                removeShadowDraft(key);
              }
            }}>
              {t("submit_page.shadow_draft_recover")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
