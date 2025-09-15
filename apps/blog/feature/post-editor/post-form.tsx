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
import { Form, FormControl, FormField, FormItem, FormMessage } from '@hive/ui/components/form';
import { useForm } from 'react-hook-form';
import useManabars from '../../components/hooks/useManabars';
import { AdvancedSettingsPostForm } from '../../components/advanced-settings-post-form';
import MdEditor from '../../components/md-editor';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useLocalStorage } from 'usehooks-ts';
import { useTranslation } from 'next-i18next';
import { createPermlink } from '@transaction/lib/utils';
import { useRouter } from 'next/router';
import { debounce } from '../../lib/utils';
import { Icons } from '@ui/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components/tooltip';
import { getLogger } from '@ui/lib/logging';
import SelectImageList from '../../components/select-image-list';
import RendererContainer from '../../components/rendererContainer';
import { usePostMutation } from '../../components/hooks/use-post-mutation';
import { handleError } from '@ui/lib/handle-error';
import { CircleSpinner } from 'react-spinners-kit';
import { postClassName } from '../../pages/[param]/[p2]/[permlink]';
import { accountFormSchema, PostFormValues, EditPostEntry, generateMaxAcceptedPayout } from './lib/utils';

const logger = getLogger('app');

export default function PostForm({
  communitiesList,
  username,
  editMode = false,
  defaultValues,
  entryValues,
  setEditMode,
  setIsSubmitting
}: {
  communitiesList?: {
    mySubs: { name: string; tag: string }[];
    other?: { name: string; tag: string };
  };
  username: string;
  editMode?: boolean;
  defaultValues: PostFormValues;
  entryValues: EditPostEntry;
  setEditMode?: Dispatch<SetStateAction<boolean>>;
  setIsSubmitting: (submitting: boolean) => void;
}) {
  const { t } = useTranslation('common_blog');
  const btnRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const { manabarsData } = useManabars(username);
  const postMutation = usePostMutation();

  const [preview, setPreview] = useState(true);
  const [selectedImg, setSelectedImg] = useState(entryValues.selectedImg ?? '');
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [sideBySide, setSideBySide] = useState(!editMode);
  const [_storedPost, storePost, removePost] = useLocalStorage<PostFormValues>(
    editMode ? `postData-edit-${entryValues.permlink}` : `postData-new-${username}`,
    entryValues
  );

  const form = useForm<PostFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: entryValues
  });

  const watchedValues = form.watch();
  useEffect(() => {
    debounce(() => {
      storePost(watchedValues);
    }, 50)();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...Object.values(watchedValues)]);

  async function onSubmit(data: PostFormValues) {
    if (!data.tags || data.tags.trim() === '') {
      setTagsError('In posting in My Blog use at least one tag');
      return;
    }
    const tags = data.tags.replace(/#/g, '').split(' ') ?? [];
    try {
      await postMutation.mutateAsync({
        permlink:
          editMode && entryValues.permlink
            ? entryValues.permlink
            : await createPermlink(data?.title ?? '', username),
        title: data.title,
        body: data.postArea,
        category: data.category,
        summary: data.postSummary,
        altAuthor: data.author,
        image: selectedImg,
        editMode,
        percentHbd: data.payoutType ? (data.payoutType === '100%' ? 0 : 10000) : 0,
        maxAcceptedPayout: generateMaxAcceptedPayout(data.payoutType, data.maxAcceptedPayout),
        tags,
        beneficiaries: data.beneficiaries
          ? data.beneficiaries
              .map(({ account, weight }) => ({
                account,
                weight: Number(weight) * 100
              }))
              .filter((b) => Number(b.weight) !== 10000)
          : []
      });
      setIsSubmitting(true);
      // Wait 2 seconds before redirecting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      setIsSubmitting(false);
      handleError(error, { method: 'post', params: data });
      throw error;
    }

    form.reset(defaultValues);
    removePost();
    if (editMode && !!setEditMode) {
      await router.replace(router.asPath);
      setEditMode(false);
      setIsSubmitting(false);
    } else {
      if (router.query.category) {
        await router.push(`/created/${router.query.category}`, undefined, { shallow: true });
      } else {
        await router.push(`/created/${tags[0]}`, undefined, { shallow: true });
      }
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
                  {tagsError ? <div className="text-xs text-destructive">{tagsError}</div> : null}

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
                  <FormMessage />
                </FormItem>
              )}
            />
            <SelectImageList content={watchedValues.postArea} value={selectedImg} onChange={setSelectedImg} />
            {!editMode ? (
              <div className="flex flex-col gap-2">
                <span>{t('submit_page.post_options')}</span>

                {!!watchedValues.maxAcceptedPayout &&
                watchedValues.maxAcceptedPayout < 1000000 &&
                watchedValues.maxAcceptedPayout > 0 ? (
                  <span className="text-xs">
                    {t('submit_page.advanced_settings_dialog.maximum_accepted_payout')}:{' '}
                    {watchedValues.maxAcceptedPayout} HBD
                  </span>
                ) : null}

                {!!watchedValues.beneficiaries && watchedValues.beneficiaries.length > 0 ? (
                  <span className="text-xs">
                    {t('submit_page.advanced_settings_dialog.beneficiaries', {
                      num: watchedValues.beneficiaries.length
                    })}
                  </span>
                ) : null}

                <span className="text-xs" data-testid="author-rewards-description">
                  {t('submit_page.author_rewards')}
                  {watchedValues.maxAcceptedPayout === 0
                    ? ` ${t('submit_page.advanced_settings_dialog.decline_payout')}`
                    : watchedValues.payoutType === '100%'
                      ? t('submit_page.power_up')
                      : ' 50% HBD / 50% HP'}
                </span>
                <AdvancedSettingsPostForm
                  username={username}
                  updateForm={(e) => form.reset(e)}
                  data={watchedValues}
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
                          {...field}
                          onValueChange={(value) => {
                            field.onChange(value);
                            if (!!router.query.category) {
                              router.replace(`/submit.html`, undefined, { shallow: false });
                            }
                          }}
                        >
                          <SelectTrigger data-testid="posting-to-list-trigger">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="blog">{t('submit_page.my_blog')}</SelectItem>
                            <SelectGroup>{t('submit_page.my_communities')}</SelectGroup>
                            {communitiesList?.mySubs.map((e) => (
                              <SelectItem key={e.tag} value={e.tag}>
                                {e.name}
                              </SelectItem>
                            ))}
                            {!!communitiesList?.other ? (
                              <>
                                <SelectGroup>{t('submit_page.others_communities')}</SelectGroup>
                                <SelectItem value={communitiesList?.other.tag}>
                                  {communitiesList?.other.name}
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
              disabled={postMutation.isLoading}
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
              onClick={handleCancel}
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
          {!!watchedValues.postArea ? (
            <div className="flex h-full overflow-y-scroll">
              <RendererContainer
                body={watchedValues.postArea}
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
