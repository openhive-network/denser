'use client';

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@hive/ui';
import clsx from 'clsx';
import * as z from 'zod';
import { Badge } from '@hive/ui/components/badge';
import { Button } from '@hive/ui/components/button';
import { Input } from '@hive/ui/components/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hive/ui/components/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@hive/ui/components/form';
import { useForm, useWatch } from 'react-hook-form';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';

import { useQuery } from '@tanstack/react-query';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { getCommunity, getSubscriptions } from '@transaction/lib/bridge-api';
import { Icons } from '@ui/components/icons';
import { withBasePath } from '@ui/lib/path-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { DEFAULT_OBSERVER, DEFAULT_PREFERENCES, Preferences } from '@/blog/lib/utils';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { useTranslation } from '@/blog/i18n/client';
import { usePostMutation } from '@/blog/features/post-editor/hooks/use-post-mutation';
import { useRouter, useSearchParams } from 'next/navigation';
import { createAsset, createPermlink } from '@transaction/lib/utils';
import {
  postClassName,
  validateTagInput,
  validateSummaryInput,
  validateAltUsernameInput,
  imagePicker,
  parseTags,
  MAX_TAGS
} from '@/blog/features/post-editor/lib/utils';
import { Separator } from '@ui/components';
import { Progress } from '@ui/components/progress';
import SelectImageList from '@/blog/features/post-editor/select-image-list';
import { AdvancedSettingsPostForm } from '@/blog/features/post-editor/advanced-settings-post-form';
import dynamic from 'next/dynamic';
import RendererContainer from '@/blog/features/post-rendering/rendererContainer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@hive/ui/components/alert-dialog';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { isCommunity } from '@ui/lib/utils';
import { useLoggedUserContext } from '@/blog/features/votes/hooks/use-logged-user';

const MdEditor = dynamic(() => import('@/blog/features/post-editor/md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-md border border-border bg-background-secondary/30">
      <CircleSpinner loading size={24} color="#dc2626" />
    </div>
  )
});

const logger = getLogger('app');

export default function PostForm({
  username,
  editMode = false,
  sideBySidePreview = true,
  post_s,
  setEditMode,
  refreshPage,
  setIsSubmitting
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
  const router = useRouter();
  const { user } = useUserClient();
  const observer = user.isLoggedIn ? user.username : DEFAULT_OBSERVER;
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get('category') ?? undefined;
  const [preferences] = useStorageWithTTL<Preferences>(`user-preferences-${username}`, DEFAULT_PREFERENCES, StorageTTL.PERMANENT);
  const defaultValues = {
    title: '',
    postArea: '',
    postSummary: '',
    tags: '',
    author: '',
    category: 'blog',
    beneficiaries: [],
    maxAcceptedPayout: preferences.blog_rewards === '0%' ? 0 : 1000000,
    payoutType: preferences.blog_rewards
  };
  const [storedPost, storePost, removePost] = useStorageWithTTL<AccountFormValues>(
    editMode ? `postData-edit-${post_s?.permlink}` : `postData-new-${username}`,
    defaultValues,
    StorageTTL.DRAFT
  );

  const [preview, setPreview] = useState(true);
  const [selectedImg, setSelectedImg] = useState(
    // Initialize with existing cover image when editing
    editMode && post_s?.json_metadata?.image?.[0] ? post_s.json_metadata.image[0] : ''
  );

  // Get the logged-in user's reputation and manabars from context (fetched once via LoggedUserProvider)
  const { reputation, manabarsData } = useLoggedUserContext();

  const [sideBySide, setSideBySide] = useState(sideBySidePreview);
  const [syncScroll, setSyncScroll] = useState(true);
  const [imagePickerState, setImagePickerState] = useState('');
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const isScrollSyncingRef = useRef(false);
  // Refs for scroll sync RAF IDs (stored outside effect to prevent leaks on re-run)
  const editorRafIdRef = useRef<number | null>(null);
  const previewRafIdRef = useRef<number | null>(null);
  // Ref for scroll cleanup function (safer than attaching to DOM element)
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const storeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [previewContent, setPreviewContent] = useState<string | undefined>(storedPost.postArea);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  // Track if we've hydrated from localStorage to avoid resetting form during typing
  const hasHydratedRef = useRef(false);
  // Track if post was successfully submitted to prevent auto-save from re-creating draft
  const hasSubmittedRef = useRef(false);
  const { t } = useTranslation('common_blog');
  const postMutation = usePostMutation();
  const { data: communityData } = useQuery({
    queryKey: ['community', categoryParam, observer],
    queryFn: () => getCommunity(categoryParam ?? storedPost.category, observer),
    enabled: isCommunity(categoryParam) || isCommunity(storedPost.category)
  });
  const { data: mySubsData } = useQuery({
    queryKey: ['subscriptions', observer],
    queryFn: () => getSubscriptions(observer),
    enabled: observer !== DEFAULT_OBSERVER
  });

  const accountFormSchema = z.object({
    title: z
      .string()
      .min(2, t('submit_page.string_must_contain', { num: 2 }))
      .max(255, t('submit_page.maximum_characters', { num: 255 })),
    postArea: z.string().min(1, t('submit_page.string_must_contain', { num: 1 })),
    postSummary: z.string().max(140, t('submit_page.maximum_characters', { num: 140 })),
    tags: z.string(),
    author: z.string().max(50, t('submit_page.maximum_characters', { num: 50 })),
    category: z.string(),
    beneficiaries: z.array(
      z.object({
        account: z.string(),
        weight: z.string()
      })
    ),
    maxAcceptedPayout: z.number(),
    payoutType: z.string()
  });

  type AccountFormValues = z.infer<typeof accountFormSchema>;
  // Check if we have a draft with actual changes (different from original post)
  const hasDraftChanges = editMode && storedPost && (
    (storedPost.postArea && storedPost.postArea !== post_s?.body) ||
    (storedPost.title && storedPost.title !== post_s?.title)
  );
  // In edit mode: use draft if it has changes, otherwise use original post
  // In new mode: use draft if available
  const entryValues = {
    title: hasDraftChanges ? (storedPost?.title || post_s?.title || '') : (post_s?.title || storedPost?.title || ''),
    postArea: hasDraftChanges ? (storedPost?.postArea || post_s?.body || '') : (post_s?.body || storedPost?.postArea || ''),
    postSummary: hasDraftChanges ? (storedPost?.postSummary || post_s?.json_metadata?.summary || '') : (post_s?.json_metadata?.summary || storedPost?.postSummary || ''),
    tags: hasDraftChanges ? (storedPost?.tags || (Array.isArray(post_s?.json_metadata?.tags) ? post_s.json_metadata.tags.join(' ') : '') || '') : ((Array.isArray(post_s?.json_metadata?.tags) ? post_s.json_metadata.tags.join(' ') : '') || storedPost?.tags || ''),
    author: hasDraftChanges ? (storedPost?.author || post_s?.json_metadata?.author || '') : (post_s?.json_metadata?.author || storedPost?.author || ''),
    category: categoryParam ?? storedPost?.category ?? post_s?.category ?? '',
    beneficiaries: storedPost?.beneficiaries || [],
    maxAcceptedPayout: post_s
      ? Number(post_s.max_accepted_payout.split(' ')[0])
      : preferences.blog_rewards === '0%' ? 0 : 1000000,
    payoutType: post_s
      ? (parseFloat(post_s.max_accepted_payout) === 0
          ? '0%'
          : post_s.percent_hbd === 0
            ? '100%'
            : '50%')
      : preferences.blog_rewards
  };
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: entryValues
  });

  // Ref always holds the latest editor value (updated immediately, even before debounced form sync)
  const latestPostAreaRef = useRef(entryValues.postArea);
  const postAreaSyncTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce form.setValue for postArea to avoid re-rendering entire PostForm on every keystroke.
  // MdEditor manages its own local state for responsive typing; this only syncs to react-hook-form.
  const handlePostAreaChange = useCallback((value: string) => {
    latestPostAreaRef.current = value;
    clearTimeout(postAreaSyncTimerRef.current);
    postAreaSyncTimerRef.current = setTimeout(() => {
      form.setValue('postArea', value);
    }, 300);
  }, [form]);

  // Hydrate form from localStorage after initial render
  // This handles the case where SSR returns empty values but localStorage has data
  useEffect(() => {
    if (hasHydratedRef.current) return;

    // Check if storedPost has actual data (not just defaults)
    const hasStoredData = storedPost.postArea || storedPost.title || storedPost.tags;

    // In edit mode, only hydrate if draft has changes different from original
    // In new mode, hydrate if there's any stored data
    const shouldHydrate = editMode ? hasDraftChanges : hasStoredData;

    if (shouldHydrate) {
      form.reset({
        ...entryValues,
        title: storedPost.title || entryValues.title,
        postArea: storedPost.postArea || entryValues.postArea,
        postSummary: storedPost.postSummary || entryValues.postSummary,
        tags: storedPost.tags || entryValues.tags,
        author: storedPost.author || entryValues.author,
        category: storedPost.category || entryValues.category,
        beneficiaries: storedPost.beneficiaries || entryValues.beneficiaries,
        maxAcceptedPayout: entryValues.maxAcceptedPayout,
        payoutType: entryValues.payoutType
      });
      setPreviewContent(storedPost.postArea);
    }
    hasHydratedRef.current = true;
  }, [storedPost, editMode, hasDraftChanges]);

  const nsfwTagCheck = communityData?.is_nsfw && !storedPost.tags?.includes('nsfw');
  useEffect(() => {
    form.setValue('tags', nsfwTagCheck ? `nsfw ${entryValues.tags}` : entryValues.tags);
  }, [!!communityData?.is_nsfw]);
  // useWatch provides reactive values that update on every form change
  const formValues = useWatch({
    control: form.control
  });

  // Memoize beneficiaries separately - only recalculate when beneficiaries change
  const beneficiaries = useMemo(() =>
    (formValues.beneficiaries ?? []).map(b => ({
      account: b.account ?? '',
      weight: b.weight ?? ''
    })),
    [formValues.beneficiaries]
  );

  // Memoize other form values with granular dependencies
  const watchedValues = useMemo(() => ({
    title: formValues.title ?? '',
    postArea: formValues.postArea ?? '',
    postSummary: formValues.postSummary ?? '',
    tags: formValues.tags ?? '',
    author: formValues.author ?? '',
    category: formValues.category ?? 'blog',
    beneficiaries,
    maxAcceptedPayout: formValues.maxAcceptedPayout ?? 1000000,
    payoutType: formValues.payoutType ?? '50%'
  }), [
    formValues.title,
    formValues.postArea,
    formValues.postSummary,
    formValues.tags,
    formValues.author,
    formValues.category,
    beneficiaries,
    formValues.maxAcceptedPayout,
    formValues.payoutType
  ]);

  // Extract postArea for use in dependency arrays
  const { postArea } = watchedValues;
  const tagsRequired = !categoryParam && watchedValues.category === 'blog';
  const tagsCheck = validateTagInput(watchedValues.tags, tagsRequired, t);
  const tagsRequiredAndEmpty = tagsRequired && (!watchedValues.tags || !watchedValues.tags.trim());
  const summaryCheck = validateSummaryInput(watchedValues.postSummary, t);
  const altUsernameCheck = validateAltUsernameInput(watchedValues.author, t);
  const communityPosting =
    mySubsData && mySubsData?.filter((e) => e[0] === categoryParam).length > 0
      ? mySubsData?.filter((e) => e[0] === categoryParam)[0][0]
      : undefined;

  useEffect(() => {
    if (hasSubmittedRef.current) return;
    clearTimeout(storeTimerRef.current);
    storeTimerRef.current = setTimeout(() => {
      storePost(watchedValues);
    }, 500);
    return () => clearTimeout(storeTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...Object.values(watchedValues)]);

  // update debounced post preview content
  useEffect(() => {
    clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => {
      setPreviewContent(postArea);
    }, 300);
    return () => clearTimeout(previewTimerRef.current);
  }, [postArea]);

  // Auto-scroll preview to bottom when typing at the end of editor (debounced)
  useEffect(() => {
    if (!syncScroll || !sideBySide || !preview) return;

    // Debounce to avoid running on every keystroke
    const timeoutId = setTimeout(() => {
      const editorScrollArea = editorContainerRef.current?.querySelector(
        '.cm-scroller'
      ) as HTMLDivElement | null;
      const previewEl = previewContainerRef.current;

      if (!editorScrollArea || !previewEl) return;

      const maxEditorScroll = editorScrollArea.scrollHeight - editorScrollArea.clientHeight;
      const isNearBottom = maxEditorScroll <= 0 || editorScrollArea.scrollTop >= maxEditorScroll - 50;

      if (isNearBottom) {
        previewEl.scrollTop = previewEl.scrollHeight;
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [postArea, syncScroll, sideBySide, preview]);

  useEffect(() => {
    setImagePickerState(imagePicker(selectedImg));
  }, [selectedImg]);

  // Set up scroll sync event listeners (optimized for large content)
  useEffect(() => {
    if (!syncScroll || !sideBySide || !preview) return;

    // Small delay to ensure CodeMirror has fully mounted
    const timeoutId = setTimeout(() => {
      const editorScrollArea = editorContainerRef.current?.querySelector(
        '.cm-scroller'
      ) as HTMLDivElement | null;
      const previewEl = previewContainerRef.current;

      if (!editorScrollArea || !previewEl) return;

      const handleEditorScroll = () => {
        if (isScrollSyncingRef.current || editorRafIdRef.current) return;

        editorRafIdRef.current = requestAnimationFrame(() => {
          editorRafIdRef.current = null;
          const maxEditorScroll = editorScrollArea.scrollHeight - editorScrollArea.clientHeight;
          const maxPreviewScroll = previewEl.scrollHeight - previewEl.clientHeight;
          if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;

          isScrollSyncingRef.current = true;
          const scrollPercentage = editorScrollArea.scrollTop / maxEditorScroll;
          previewEl.scrollTop = scrollPercentage * maxPreviewScroll;
          requestAnimationFrame(() => {
            isScrollSyncingRef.current = false;
          });
        });
      };

      const handlePreviewScroll = () => {
        if (isScrollSyncingRef.current || previewRafIdRef.current) return;

        previewRafIdRef.current = requestAnimationFrame(() => {
          previewRafIdRef.current = null;
          const maxEditorScroll = editorScrollArea.scrollHeight - editorScrollArea.clientHeight;
          const maxPreviewScroll = previewEl.scrollHeight - previewEl.clientHeight;
          if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;

          isScrollSyncingRef.current = true;
          const scrollPercentage = previewEl.scrollTop / maxPreviewScroll;
          editorScrollArea.scrollTop = scrollPercentage * maxEditorScroll;
          requestAnimationFrame(() => {
            isScrollSyncingRef.current = false;
          });
        });
      };

      // Use passive listeners for better scroll performance
      editorScrollArea.addEventListener('scroll', handleEditorScroll, { passive: true });
      previewEl.addEventListener('scroll', handlePreviewScroll, { passive: true });

      // Store cleanup function in ref (safer than attaching to DOM element)
      scrollCleanupRef.current = () => {
        if (editorRafIdRef.current) cancelAnimationFrame(editorRafIdRef.current);
        if (previewRafIdRef.current) cancelAnimationFrame(previewRafIdRef.current);
        editorRafIdRef.current = null;
        previewRafIdRef.current = null;
        editorScrollArea.removeEventListener('scroll', handleEditorScroll);
        previewEl.removeEventListener('scroll', handlePreviewScroll);
      };
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      // Cancel any pending RAF frames immediately (in case timeout hasn't fired yet)
      if (editorRafIdRef.current) cancelAnimationFrame(editorRafIdRef.current);
      if (previewRafIdRef.current) cancelAnimationFrame(previewRafIdRef.current);
      editorRafIdRef.current = null;
      previewRafIdRef.current = null;
      // Run stored cleanup if timeout had set up listeners
      if (scrollCleanupRef.current) {
        scrollCleanupRef.current();
        scrollCleanupRef.current = null;
      }
    };
  }, [syncScroll, sideBySide, preview]);

  async function onSubmit(data: AccountFormValues) {
    // Flush pending debounce - use the latest editor value which may not have synced to form yet
    clearTimeout(postAreaSyncTimerRef.current);
    const postBody = latestPostAreaRef.current || data.postArea;

    const tags = parseTags(data.tags);
    const maxAcceptedPayout = await createAsset((data.maxAcceptedPayout * 1000).toString(), 'HBD');
    const postPermlink = await createPermlink(data?.title ?? '', username);
    const permlinInEditMode = post_s?.permlink;

    // Calculate if reward options changed (became more restrictive) in edit mode
    let newPercentHbd = data.payoutType ? (data.payoutType === '100%' ? 0 : 10000) : 10000;
    const newMaxPayout = data.maxAcceptedPayout;
    let rewardOptionsChanged = false;

    if (editMode && post_s) {
      const originalPercentHbd = post_s.percent_hbd;
      const originalMaxPayout = parseFloat(post_s.max_accepted_payout);

      // When declining payout (max=0), keep original percent_hbd
      // because blockchain rejects increasing percent_hbd
      if (newMaxPayout === 0) {
        newPercentHbd = Math.min(newPercentHbd, originalPercentHbd);
      }

      // Ensure we never try to increase percent_hbd (blockchain rejects this)
      newPercentHbd = Math.min(newPercentHbd, originalPercentHbd);

      // Check if options became more restrictive
      const percentHbdChanged = newPercentHbd < originalPercentHbd;
      const maxPayoutChanged = newMaxPayout < originalMaxPayout;

      rewardOptionsChanged = percentHbdChanged || maxPayoutChanged;
    }

    try {
      if (btnRef.current) {
        btnRef.current.disabled = true;
      }
      const postParams = {
        permlink: editMode && permlinInEditMode ? permlinInEditMode : postPermlink,
        title: data.title,
        body: postBody,
        category: data.category,
        summary: data.postSummary,
        altAuthor: data.author,
        image: selectedImg,
        reputation,
        editMode,
        percentHbd: newPercentHbd,
        maxAcceptedPayout,
        tags,
        beneficiaries: data.beneficiaries
          ? data.beneficiaries
              .map(({ account, weight }) => ({
                account,
                weight: Number(weight) * 100
              }))
              .filter((b) => Number(b.weight) !== 10000)
              .sort((a, b) => a.account.localeCompare(b.account))
          : [],
        rewardOptionsChanged
      };
      try {
        await postMutation.mutateAsync(postParams);
        // Broadcast succeeded - post is guaranteed to be in blockchain
        // No need to wait, redirect immediately to the post page
      } catch (error) {
        setIsSubmitting(false);
        handleError(error, { method: 'post', params: postParams });
        throw error;
      }

      // Mark as submitted to prevent auto-save from re-creating draft
      hasSubmittedRef.current = true;
      removePost();
      latestPostAreaRef.current = defaultValues.postArea;
      form.reset(defaultValues);
      setPreviewContent(undefined);
      if (editMode) {
        if (refreshPage && setEditMode) {
          setIsSubmitting(false);
          setEditMode(!editMode);
          refreshPage();
        }
      } else {
        // Redirect to the actual post page for instant viewing
        // The post data is already seeded in React Query cache via onMutate
        const postUrl = `/${postParams.category}/@${username}/${postParams.permlink}`;
        await router.push(withBasePath(postUrl), undefined);
      }
      if (btnRef.current) {
        btnRef.current.disabled = false;
      }
    } catch (error) {
      if (btnRef.current) {
        btnRef.current.disabled = false;
      }
      logger.error(error);
    }
  }

  const handleCancel = () => {
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = () => {
    clearTimeout(postAreaSyncTimerRef.current);
    latestPostAreaRef.current = defaultValues.postArea;
    form.reset(defaultValues);
    removePost();
    if (editMode && setEditMode) {
      setEditMode(false);
    }
    setCancelDialogOpen(false);
  };
  const handleLoadTemplate = (data: AccountFormValues) => {
    clearTimeout(postAreaSyncTimerRef.current);
    latestPostAreaRef.current = data.postArea;
    form.setValue('author', data.author);
    form.setValue('beneficiaries', data.beneficiaries);
    form.setValue('category', data.category);
    form.setValue('maxAcceptedPayout', data.maxAcceptedPayout);
    form.setValue('payoutType', data.payoutType);
    form.setValue('postArea', data.postArea);
    form.setValue('postSummary', data.postSummary);
    form.setValue('tags', data.tags);
    form.setValue('title', data.title);
  };
  return (
    <div className={clsx({ container: !sideBySide || !preview })}>
      <div
        className={clsx('relative flex flex-col gap-4 bg-background p-4 sm:p-6 lg:p-8', {
          'lg:flex-row': sideBySide
        })}
        data-testid="form-and-preview-container"
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={clsx('flex flex-col gap-6 lg:w-1/2', { 'lg:w-full': !preview || !sideBySide })}
            data-testid="form-container"
          >
            <div className="flex items-center justify-between rounded-md bg-background-secondary px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSideBySide((prev) => !prev)}
                data-testid="enable-disable-side-by-side-editor"
                tabIndex={-1}
              >
                {sideBySide ? t('submit_page.disable_side') : t('submit_page.enable_side')}
              </Button>
              <Button
                type="button"
                onClick={() => setPreview((prev) => !prev)}
                variant="ghost"
                className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                data-testid="hide-show-preview"
                tabIndex={-1}
              >
                {preview ? t('submit_page.hide_preview') : t('submit_page.show_preview')}
              </Button>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder={t('submit_page.title')}
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
                    {t('submit_page.insert_images_by_dragging')} {t('submit_page.selecting_them')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger type="button" tabIndex={-1}>
                          <Icons.info className="ml-1 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>{t('submit_page.insert_images_info')}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />

            <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-secondary/30 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('submit_page.metadata_section')}
              </span>

              <FormField
                control={form.control}
                name="postSummary"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder={t('submit_page.post_summary')}
                          className={clsx(
                            'pr-16 bg-background',
                            { 'border-red-500 focus-visible:ring-red-500': summaryCheck }
                          )}
                          {...field}
                        />
                        <span
                          className={clsx(
                            'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums',
                            field.value.length > 140 ? 'text-red-500' : 'text-muted-foreground'
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
                          placeholder={t('submit_page.enter_your_tags')}
                          className={clsx(
                            'pr-12 bg-background',
                            { 'border-red-500 focus-visible:ring-red-500': tagsCheck }
                          )}
                          {...field}
                          onChange={(e) => {
                            const normalized = e.target.value.replace(/,/g, ' ');
                            field.onChange(normalized);
                          }}
                        />
                        {parseTags(field.value).length > 0 && (
                          <span
                            className={clsx(
                              'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums',
                              parseTags(field.value).length > MAX_TAGS ? 'text-red-500' : 'text-muted-foreground'
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
                              form.setValue('tags', tags.join(' '));
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
                        placeholder={t('submit_page.author_if_different')}
                        className={clsx('bg-background', { 'border-red-500 focus-visible:ring-red-500': altUsernameCheck })}
                        {...field}
                      />
                    </FormControl>
                    <div className="text-xs text-red-500">{altUsernameCheck}</div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SelectImageList content={postArea} value={selectedImg} onChange={setSelectedImg} />
            </div>

            <div className="flex flex-col gap-4 rounded-lg border border-border bg-background-secondary/30 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('submit_page.publishing_section')}
              </span>

              {!editMode ? (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{t('submit_page.post_options')}</span>

                  {watchedValues.maxAcceptedPayout < 1000000 && watchedValues.maxAcceptedPayout > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t('submit_page.advanced_settings_dialog.maximum_accepted_payout')}:{' '}
                      {watchedValues.maxAcceptedPayout} HBD
                    </span>
                  ) : null}

                  {watchedValues.beneficiaries.length > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t('submit_page.advanced_settings_dialog.beneficiaries', {
                        num: watchedValues.beneficiaries.length
                      })}
                    </span>
                  ) : null}

                  <span className="text-xs text-muted-foreground" data-testid="author-rewards-description">
                    {t('submit_page.author_rewards')}
                    {watchedValues.maxAcceptedPayout === 0
                      ? ` ${t('submit_page.advanced_settings_dialog.decline_payout')}`
                      : watchedValues.payoutType === '100%'
                        ? t('submit_page.power_up')
                        : ' 50% HBD / 50% HP'}
                  </span>
                  <AdvancedSettingsPostForm
                    username={username}
                    updateForm={(e) => handleLoadTemplate(e)}
                    data={watchedValues}
                  >
                    <span
                      className="w-fit cursor-pointer text-xs text-destructive hover:underline"
                      title={t('submit_page.advanced_tooltip')}
                      data-testid="advanced-settings-button"
                    >
                      {t('submit_page.advanced_settings')}
                    </span>
                  </AdvancedSettingsPostForm>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">{t('submit_page.author_rewards')}</span>
                  {/* In edit mode: show read-only if declined, otherwise allow more restrictive options */}
                  {post_s && parseFloat(post_s.max_accepted_payout) === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {t('submit_page.reward_options_final')}
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
                                  // Update maxAcceptedPayout when declining
                                  if (value === '0%') {
                                    form.setValue('maxAcceptedPayout', 0);
                                  } else if (watchedValues.maxAcceptedPayout === 0) {
                                    // Restore original max if changing from decline
                                    form.setValue('maxAcceptedPayout', post_s ? Number(post_s.max_accepted_payout.split(' ')[0]) : 1000000);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[180px]" data-testid="edit-reward-type-select">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {/* Only show options that are MORE restrictive than current */}
                                  {post_s && post_s.percent_hbd === 10000 && (
                                    <SelectItem value="50%">50% HBD / 50% HP</SelectItem>
                                  )}
                                  {post_s && post_s.percent_hbd > 0 && (
                                    <SelectItem value="100%">{t('submit_page.power_up')}</SelectItem>
                                  )}
                                  <SelectItem value="0%">{t('submit_page.advanced_settings_dialog.decline_payout')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <span className="text-xs text-muted-foreground">
                        {t('submit_page.reward_options_restrictive')}
                      </span>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">{t('submit_page.account_stats')}</span>
                <div className="flex items-center gap-3">
                  <Progress
                    value={manabarsData?.rc.percentageValue ?? 0}
                    className="h-2 flex-1"
                    indicatorClassName="bg-[#0088FE]"
                  />
                  <span className="text-xs tabular-nums text-muted-foreground" data-testid="resource-credits-description">
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
                        <span className="text-muted-foreground">{t('submit_page.posting_to')}</span>
                        <FormControl>
                          <Select
                            value={
                              communityPosting
                                ? communityPosting
                                : storedPost?.category
                                  ? storedPost.category
                                  : 'blog'
                            }
                            onValueChange={(e) => {
                              form.setValue('category', e);
                              storePost({ ...storedPost, category: e });
                              if (categoryParam) {
                                router.replace(withBasePath(`/submit.html`));
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="w-auto min-w-[140px]" data-testid="posting-to-list-trigger">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="blog">{t('submit_page.my_blog')}</SelectItem>
                              <SelectGroup className="py-2 ml-2">{t('submit_page.my_communities')}</SelectGroup>
                              {mySubsData?.map((e) => (
                                <SelectItem key={e[0]} value={e[0]}>
                                  {e[1]}
                                </SelectItem>
                              ))}
                              {!mySubsData?.some((e) => e[0] === storedPost.category) &&
                              storedPost.category !== 'blog' ? (
                                <>
                                  <SelectGroup>{t('submit_page.others_communities')}</SelectGroup>
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
                    t('submit_page.submit')
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
                  {editMode ? t('submit_page.cancel') : t('submit_page.clean')}
                </Button>
              </div>
              {!postMutation.isPending && (!storedPost?.title || !storedPost?.postArea || tagsRequiredAndEmpty) && (
                <p className="text-xs text-muted-foreground" data-testid="submit-requirements-hint">
                  {!storedPost?.title && !storedPost?.postArea
                    ? t('submit_page.enter_title_and_content')
                    : !storedPost?.title
                      ? t('submit_page.enter_title')
                      : !storedPost?.postArea
                        ? t('submit_page.enter_content')
                        : t('submit_page.enter_tags')}
                </p>
              )}
            </div>
          </form>
        </Form>

        <div
          className={clsx('relative flex flex-col lg:w-1/2', {
            hidden: !preview,
            'lg:w-full': !sideBySide,
            'h-[80vh]': sideBySide
          })}
          data-testid="preview-container"
        >
          {/* Floating sync scroll button - positioned at left edge of preview, vertically centered */}
          {sideBySide && (
            <div
              className="group absolute left-[-7px] top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
              data-testid="sync-scroll-container"
            >
              {/* Larger hover area for easier discovery */}
              <div className="flex h-[150px] items-center justify-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 rounded-full border-border bg-background p-0 opacity-20 shadow-lg transition-opacity duration-200 hover:bg-background-secondary group-hover:opacity-100"
                        onClick={() => setSyncScroll((prev) => !prev)}
                        data-testid="sync-scroll-toggle"
                        tabIndex={-1}
                      >
                        {syncScroll ? (
                          <Icons.link2 className="h-5 w-5 text-foreground" />
                        ) : (
                          <Icons.link2Off className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {syncScroll
                        ? t('submit_page.disable_sync_scroll')
                        : t('submit_page.enable_sync_scroll')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-background-secondary/50 px-4 py-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('submit_page.preview')}
            </span>
            <Link
              target="_blank"
              href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
              tabIndex={-1}
            >
              <span className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                {t('submit_page.markdown_styling_guide')}
              </span>
            </Link>
          </div>
          <div ref={previewContainerRef} className="flex h-full overflow-y-auto rounded-b-lg border border-border">
            {previewContent ? (
              <RendererContainer
                body={previewContent}
                author=""
                previewMode
                className={
                  postClassName +
                  ' w-full min-w-full self-center break-words p-4'
                }
              />
            ) : (
              <div className="flex w-full flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
                <Icons.eye className="h-8 w-8 opacity-20" />
                <span className="text-sm">{t('submit_page.preview_placeholder')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editMode ? t('post_content.close_post_editor') : t('submit_page.clean_post_editor')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('submit_page.cancel_confirmation_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('submit_page.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('submit_page.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
