import { Button } from '@hive/ui/components/button';
import { Input } from '@hive/ui/components/input';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hive/ui/components/select';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@hive/ui/components/form';
import { useForm, useWatch } from 'react-hook-form';
import useManabars from './hooks/useManabars';
import { AdvancedSettingsPostForm } from './advanced-settings-post-form';
import MdEditor from './md-editor';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useLocalStorage } from 'usehooks-ts';
import { useTranslation } from 'next-i18next';
import { createAsset, createPermlink } from '@transaction/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Entry, getCommunity, getSubscriptions } from '@transaction/lib/bridge';
import { useRouter } from 'next/router';
import { TFunction } from 'i18next';
import { debounce } from '../lib/utils';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { DEFAULT_PREFERENCES, Preferences } from '../pages/[param]/settings';
import { getLogger } from '@ui/lib/logging';
import SelectImageList from './select-image-list';
import RendererContainer from './rendererContainer';
import { usePostMutation } from './hooks/use-post-mutation';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { postClassName } from '../pages/[param]/[p2]/[permlink]';

const logger = getLogger('app');

const MAX_TAGS = 8;
function validateTagInput(value: string, required: boolean, t: TFunction<'common_blog', undefined>) {
  if (!value || value.trim() === '') return required ? t('submit_page.category_selector.required') : null;
  const tags = value.trim().replace(/#/g, '').split(/ +/);
  return tags.length > MAX_TAGS
    ? t('submit_page.category_selector.use_limited_amount_of_categories', {
        amount: MAX_TAGS
      })
    : tags.find((c) => c.length > 24)
      ? t('submit_page.category_selector.maximum_tag_length_is_24_characters')
      : tags.find((c) => c.split('-').length > 2)
        ? t('submit_page.category_selector.use_one_dash')
        : tags.find((c) => c.indexOf(',') >= 0)
          ? t('submit_page.category_selector.use_spaces_to_separate_tags')
          : tags.find((c) => /[A-Z]/.test(c))
            ? t('submit_page.category_selector.use_only_lowercase_letters')
            : tags.find((c) => !/^[a-z0-9-#]+$/.test(c))
              ? t('submit_page.category_selector.use_only_allowed_characters')
              : tags.find((c) => !/^[a-z-#]/.test(c))
                ? t('submit_page.category_selector.must_start_with_a_letter')
                : tags.find((c) => !/[a-z0-9]$/.test(c))
                  ? t('submit_page.category_selector.must_end_with_a_letter_or_number')
                  : tags.filter((c) => c.substring(0, 5) === 'hive-').length > 0
                    ? t('submit_page.category_selector.must_not_include_hivemind_community_owner')
                    : tags.reduce((acc, tag, index, array) => {
                          const isDuplicate = array.slice(index + 1).some((b) => b === tag);
                          return acc || isDuplicate;
                        }, false)
                      ? t('submit_page.category_selector.tags_cannot_be_repeated')
                      : null;
}

function validateSummaryInput(value: string, t: TFunction<'common_wallet', undefined>) {
  const markdownRegex = /(?:\*[\w\s]*\*|#[\w\s]*#|_[\w\s]*_|~[\w\s]*~|\]\s*\(|\]\s*\[)/;
  const htmlTagRegex = /<\/?[\w\s="/.':;#-/?]+>/gi;
  return markdownRegex.test(value)
    ? t('submit_page.markdown_not_supported')
    : htmlTagRegex.test(value)
      ? t('submit_page.html_not_supported')
      : null;
}

function validateAltUsernameInput(value: string, t: TFunction<'common_wallet', undefined>) {
  const altAuthorAllowedCharactersRegex = /^[\w.\d-]+$/;
  return value !== '' && !altAuthorAllowedCharactersRegex.test(value)
    ? t('submit_page.must_contain_only')
    : null;
}
export function imagePicker(img: string) {
  const checkImg = img.startsWith('youtu-') ? `https://img.youtube.com/vi/${img.slice(6)}/0.jpg` : img;
  return checkImg;
}

export default function PostForm({
  username,
  editMode = false,
  sideBySidePreview = true,
  post_s,
  setEditMode,
  refreshPage
}: {
  username: string;
  editMode: boolean;
  sideBySidePreview: boolean;
  post_s?: Entry;
  setEditMode?: Dispatch<SetStateAction<boolean>>;
  refreshPage?: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [preferences] = useLocalStorage<Preferences>(`user-preferences-${username}`, DEFAULT_PREFERENCES);
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
  const [storedPost, storePost, removePost] = useLocalStorage<AccountFormValues>(
    editMode ? `postData-edit-${post_s?.permlink}` : 'postData-new',
    defaultValues
  );
  useEffect(() => {
    storePost({
      ...storedPost,
      payoutType: preferences.blog_rewards,
      maxAcceptedPayout: preferences.blog_rewards === '0%' ? 0 : 1000000
    });
  }, [preferences.blog_rewards]);
  const [preview, setPreview] = useState(true);
  const [selectedImg, setSelectedImg] = useState('');
  const [sideBySide, setSideBySide] = useState(sideBySidePreview);
  const [imagePickerState, setImagePickerState] = useState('');
  const { manabarsData } = useManabars(username);
  const [previewContent, setPreviewContent] = useState<string | undefined>(storedPost.postArea);
  const { t } = useTranslation('common_blog');
  const postMutation = usePostMutation();

  const { data: mySubsData } = useQuery(['subscriptions', username], () => getSubscriptions(username), {
    enabled: Boolean(username)
  });
  const { data: communityData } = useQuery(
    ['community', router.query.category, ''],
    () =>
      getCommunity(router.query.category ? router.query.category.toString() : storedPost.category, username),
    {
      enabled: Boolean(router.query.category) || Boolean(storedPost.category)
    }
  );

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
  const entryValues = {
    title: post_s?.title || storedPost?.title || '',
    postArea: post_s?.body || storedPost?.postArea || '',
    postSummary: post_s?.json_metadata?.summary || storedPost?.postSummary || '',
    tags: post_s?.json_metadata?.tags?.join(' ') || storedPost?.tags || '',
    author: post_s?.json_metadata?.author || storedPost?.author || '',
    category: (router.query.category as string) ?? storedPost?.category ?? post_s?.category ?? '',
    beneficiaries: storedPost?.beneficiaries || [],
    maxAcceptedPayout: post_s
      ? Number(post_s.max_accepted_payout.split(' ')[0])
      : storedPost?.maxAcceptedPayout === undefined
        ? 1000000
        : storedPost.maxAcceptedPayout,
    payoutType: post_s ? `${post_s.percent_hbd}%` : storedPost?.payoutType || preferences.blog_rewards
  };
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: entryValues
  });
  const { postArea, ...restFields } = useWatch({
    control: form.control
  });

  const watchedValues = form.getValues();
  const tagsCheck = validateTagInput(
    watchedValues.tags,
    !router.query.category ? watchedValues.category === 'blog' : false,
    t
  );
  const summaryCheck = validateSummaryInput(watchedValues.postSummary, t);
  const altUsernameCheck = validateAltUsernameInput(watchedValues.author, t);
  const communityPosting =
    mySubsData && mySubsData?.filter((e) => e[0] === router.query.category).length > 0
      ? mySubsData?.filter((e) => e[0] === router.query.category)[0][0]
      : undefined;

  useEffect(() => {
    debounce(() => {
      storePost(watchedValues);
    }, 50)();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...Object.values(watchedValues)]);

  // update debounced post preview content
  useEffect(() => {
    if (typeof previewContent !== 'undefined' && postArea !== previewContent) {
      debounce(() => {
        setPreviewContent(postArea);
      }, 50)();
    }
  }, [previewContent, watchedValues.postArea]);

  useEffect(() => {
    setImagePickerState(imagePicker(selectedImg));
  }, [selectedImg, watchedValues.postArea]);

  async function onSubmit(data: AccountFormValues) {
    const tags = data.tags.replace(/#/g, '').split(' ') ?? [];
    const maxAcceptedPayout = createAsset((data.maxAcceptedPayout * 1000).toString(), 'HBD');
    const postPermlink = await createPermlink(data?.title ?? '', username);
    const permlinInEditMode = post_s?.permlink;
    try {
      if (btnRef.current) {
        btnRef.current.disabled = true;
      }

      const postParams = {
        permlink: editMode && permlinInEditMode ? permlinInEditMode : postPermlink,
        title: data.title,
        body: data.postArea,
        beneficiaries: data.beneficiaries,
        maxAcceptedPayout,
        tags,
        category: communityPosting ? communityPosting : data.category,
        summary: data.postSummary,
        altAuthor: data.author,
        payoutType: data.payoutType ?? preferences.blog_rewards,
        image: imagePickerState,
        editMode
      };

      try {
        await postMutation.mutateAsync(postParams);
      } catch (error) {
        handleError(error, { method: 'post', params: postParams });
        throw error;
      }

      form.reset(defaultValues);
      setPreviewContent(undefined);
      removePost();
      if (editMode) {
        if (refreshPage && setEditMode) {
          setEditMode(!editMode);
          refreshPage();
        }
      } else {
        if (router.query.category) {
          await router.push(`/created/${router.query.category}`, undefined, { shallow: true });
        } else {
          await router.push(`/created/${tags[0]}`, undefined, { shallow: true });
        }
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
    const confirmed = confirm(
      editMode ? t('post_content.close_post_editor') : t('submit_page.clean_post_editor')
    );
    if (confirmed) {
      form.reset(defaultValues);
      if (editMode && setEditMode) {
        setEditMode(false);
        removePost();
      }
    }
  };
  const handleLoadTemplate = (data: AccountFormValues) => {
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
        className={clsx('flex flex-col gap-4 bg-background p-8', {
          'lg:flex-row': sideBySide
        })}
        data-testid="form-and-preview-container"
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={clsx('space-y-8 lg:w-1/2', { 'lg:w-full': !preview || !sideBySide })}
            data-testid="form-container"
          >
            <div className="flex items-center justify-between">
              <h1
                className="cursor-pointer text-sm text-destructive"
                onClick={() => setSideBySide((prev) => !prev)}
                data-testid="enable-disable-side-by-side-editor"
              >
                {sideBySide ? t('submit_page.disable_side') : t('submit_page.enable_side')}
              </h1>
              <Button
                type="button"
                onClick={() => setPreview((prev) => !prev)}
                variant="link"
                className="hover:text-destructive"
                data-testid="hide-show-preview"
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
                    <Input placeholder={t('submit_page.title')} {...field} data-testid="post-title-input" />
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
                    <>
                      <MdEditor
                        windowheight={500}
                        htmlMode={editMode}
                        onChange={(value) => {
                          form.setValue('postArea', value);
                        }}
                        persistedValue={field.value}
                      />
                    </>
                  </FormControl>
                  <div className="flex items-center border-x-2 border-b-2 border-border px-3 pb-1 text-xs text-destructive">
                    {t('submit_page.insert_images_by_dragging')} {t('submit_page.selecting_them')}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger type="button">
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
            <FormField
              control={form.control}
              name="postSummary"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder={t('submit_page.post_summary')} {...field} />
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
                    <Input placeholder={t('submit_page.enter_your_tags')} {...field} />
                  </FormControl>
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
                    <Input placeholder={t('submit_page.author_if_different')} {...field} />
                  </FormControl>
                  <div className="text-xs text-red-500">{altUsernameCheck}</div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SelectImageList content={watchedValues.postArea} value={selectedImg} onChange={setSelectedImg} />
            {!editMode ? (
              <div className="flex flex-col gap-2">
                <span>{t('submit_page.post_options')}</span>

                {storedPost.maxAcceptedPayout < 1000000 && storedPost.maxAcceptedPayout > 0 ? (
                  <span className="text-xs">
                    {t('submit_page.advanced_settings_dialog.maximum_accepted_payout')}:{' '}
                    {storedPost.maxAcceptedPayout} HBD
                  </span>
                ) : null}

                {storedPost.beneficiaries.length > 0 ? (
                  <span className="text-xs">
                    {t('submit_page.advanced_settings_dialog.beneficiaries', {
                      num: storedPost.beneficiaries.length
                    })}
                  </span>
                ) : null}

                <span className="text-xs" data-testid="author-rewards-description">
                  {t('submit_page.author_rewards')}
                  {preferences.blog_rewards === '0%' || storedPost.maxAcceptedPayout === 0
                    ? ` ${t('submit_page.advanced_settings_dialog.decline_payout')}`
                    : preferences.blog_rewards === '100%' || storedPost.payoutType === '100%'
                      ? t('submit_page.power_up')
                      : ' 50% HBD / 50% HP'}
                </span>
                <AdvancedSettingsPostForm
                  username={username}
                  updateForm={(e) => handleLoadTemplate(e)}
                  data={storedPost}
                >
                  <span
                    className="w-fit cursor-pointer text-xs text-destructive"
                    title={t('submit_page.advanced_tooltip')}
                    data-testid="advanced-settings-button"
                  >
                    {t('submit_page.advanced_settings')}
                  </span>
                </AdvancedSettingsPostForm>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <span>{t('submit_page.account_stats')}</span>
              <span className="text-xs" data-testid="resource-credits-description">
                {t('submit_page.resource_credits', { value: manabarsData?.rc.percentageValue })}
              </span>
            </div>
            {!editMode ? (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap items-center gap-4">
                      {t('submit_page.posting_to')}
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
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="posting-to-list-trigger">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="blog">{t('submit_page.my_blog')}</SelectItem>
                            <SelectGroup>{t('submit_page.my_communities')}</SelectGroup>
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
            <Button
              ref={btnRef}
              type="submit"
              variant="redHover"
              className="w-24"
              disabled={
                !storedPost?.title ||
                Boolean(tagsCheck) ||
                Boolean(summaryCheck) ||
                Boolean(altUsernameCheck) ||
                postMutation.isLoading
              }
              data-testid="submit-post-button"
            >
              {postMutation.isLoading ? (
                <CircleSpinner loading={postMutation.isLoading} size={18} color="#dc2626" />
              ) : (
                t('submit_page.submit')
              )}
            </Button>
            <Button
              disabled={postMutation.isLoading}
              onClick={() => handleCancel()}
              type="reset"
              variant="ghost"
              className="font-thiny text-foreground/60 hover:text-destructive"
              data-testid="clean-post-button"
            >
              {editMode ? t('submit_page.cancel') : t('submit_page.clean')}
            </Button>
          </form>
        </Form>
        <div
          className={clsx('flex flex-col gap-4 lg:w-1/2', {
            hidden: !preview,
            'lg:w-full': !sideBySide,
            'h-[80vh] ': sideBySide
          })}
          data-testid="preview-container"
        >
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between">
            <span className="text-slate-500">{t('submit_page.preview')}</span>
            <Link
              target="_blank"
              href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
            >
              <span className="text-sm text-destructive">{t('submit_page.markdown_styling_guide')}</span>
            </Link>
          </div>
          {previewContent ? (
            <div className="flex h-full overflow-y-scroll">
              <RendererContainer
                body={previewContent}
                author=""
                className={
                  postClassName +
                  ' w-full min-w-full self-center overflow-y-scroll break-words border-2 border-border p-2'
                }
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
