import { Button } from '@hive/ui/components/button';
import { Input } from '@hive/ui/components/input';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hive/ui/components/select';
import { Label } from '@radix-ui/react-label';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage
} from '@hive/ui/components/form';
import { useForm } from 'react-hook-form';
import useManabars from './hooks/useManabars';
import { AdvancedSettingsPostForm } from './advanced_settings_post_form';
import MdEditor from './md-editor';
import { useContext, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useLocalStorage } from '@smart-signer/lib/use-local-storage';
import { useTranslation } from 'next-i18next';
import { HiveRendererContext } from './hive-renderer-context';
import { transactionService } from '@transaction/index';
import { createPermlink } from '@transaction/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getSubscriptions } from '@transaction/lib/bridge';
import { useRouter } from 'next/router';

const defaultValues = {
  title: '',
  postArea: '',
  postSummary: '',
  tags: '',
  author: '',
  category: '',
  beneficiaries: [],
  maxAcceptedPayout: null,
  payoutType: '50%'
};

export default function PostForm({ username }: { username: string }) {
  const { hiveRenderer } = useContext(HiveRendererContext);
  const router = useRouter();
  const [preview, setPreview] = useState(true);
  const [sideBySide, setSideBySide] = useState(true);
  const [postPermlink, setPostPermlink] = useState('');
  const { manabarsData } = useManabars(username);
  const [storedPost, storePost] = useLocalStorage<AccountFormValues>('postData', defaultValues);
  const { t } = useTranslation('common_blog');
  const {
    data: mySubsData,
    isLoading: mySubsIsLoading,
    isError: mySubsIsError
  } = useQuery([['subscriptions', username]], () => getSubscriptions(username), {
    enabled: Boolean(username)
  });
  const accountFormSchema = z.object({
    title: z.string().min(2, t('submit_page.string_must_contain', { num: 2 })),
    postArea: z.string().min(1, t('submit_page.string_must_contain', { num: 1 })),
    postSummary: z.string().max(140),
    tags: z
      .string()
      .refine((v) => !((v.match(/hive-/g) || []).length > 1), {
        message: t('submit_page.to_many_communities')
      })
      .refine((v) => v.split(/\s+/).length <= 8, {
        message: t('submit_page.to_many_tags')
      }),
    author: z.string().regex(/^$|^[[a-zAZ1-9]+$/, t('submit_page.must_contain_only')),
    category: z.string(),
    beneficiaries: z.array(
      z.object({
        username: z.string(),
        percent: z.string()
      })
    ),
    maxAcceptedPayout: z.number().nullable(),
    payoutType: z.string()
  });

  type AccountFormValues = z.infer<typeof accountFormSchema>;
  const getValues = (storedPost?: AccountFormValues) => ({
    title: storedPost?.title ?? '',
    postArea: storedPost?.postArea ?? '',
    postSummary: storedPost?.postSummary ?? '',
    tags: storedPost?.tags ?? '',
    author: storedPost?.author ?? '',
    category: storedPost?.category ?? '',
    beneficiaries: storedPost?.beneficiaries ?? [],
    maxAcceptedPayout: storedPost?.maxAcceptedPayout ?? 0,
    payoutType: storedPost?.payoutType ?? ''
  });
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    values: getValues(storedPost)
  });
  const watchedValues = form.watch();

  useEffect(() => {
    storePost(watchedValues);
  }, [JSON.stringify(watchedValues)]);

  useEffect(() => {
    const createPostPermlink = async () => {
      const plink = await createPermlink(storedPost?.title ?? '', username, storedPost?.title ?? '');
      setPostPermlink(plink);
    };

    createPostPermlink();
  }, [username, storedPost?.title]);

  async function onSubmit(data: AccountFormValues) {
    const tags = storedPost?.tags.split(' ') ?? [];
    try {
      await transactionService.post(postPermlink, storedPost?.title ?? '', watchedValues.postArea, tags);
    } finally {
      storePost(defaultValues);
      router.push(`/created/${tags[0]}`);
    }
  }

  return (
    <div className={clsx({ container: !sideBySide || !preview })}>
      <div
        className={clsx('flex flex-col gap-4 bg-white p-8 dark:bg-slate-950', {
          'lg:flex-row': sideBySide
        })}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={clsx('space-y-8 lg:w-1/2', { 'lg:w-full': !preview || !sideBySide })}
          >
            <div className="flex items-center justify-between">
              <h1
                className="cursor-pointer text-sm text-destructive"
                onClick={() => setSideBySide((prev) => !prev)}
              >
                {sideBySide ? t('submit_page.disable_side') : t('submit_page.enable_side')}
              </h1>
              <Button
                onClick={() => setPreview((prev) => !prev)}
                variant="link"
                className="hover:text-destructive"
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
                    <Input placeholder={t('submit_page.title')} {...field} />
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
                    <MdEditor data={field} />
                  </FormControl>
                  <FormDescription className="border-x-2 border-b-2 border-border px-3 pb-1 text-xs text-destructive">
                    {t('submit_page.insert_images_by_dragging')},
                    <span>
                      <Label className="cursor-pointer text-red-500" htmlFor="picture">
                        {t('submit_page.selecting_them')}
                      </Label>
                      <Input id="picture" type="file" className="hidden" />
                    </span>
                    .
                  </FormDescription>
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
            <div className="flex flex-col gap-2">
              <span>{t('submit_page.post_options')}</span>
              <span className="text-xs">
                {t('submit_page.author_rewards')}
                {storedPost?.payoutType === '100%' ? t('submit_page.power_up') : ' 50% HBD / 50% HP'}
              </span>
              <AdvancedSettingsPostForm username={username} onChangeStore={storePost} data={storedPost}>
                <span className="cursor-pointer text-xs text-destructive">
                  {t('submit_page.advanced_settings')}
                </span>
              </AdvancedSettingsPostForm>
            </div>
            <div className="flex flex-col gap-2">
              <span>{t('submit_page.account_stats')}</span>
              <span className="text-xs">
                {t('submit_page.resource_credits', { value: manabarsData?.rc.percentageValue })}
              </span>
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-wrap items-center gap-4">
                    {t('submit_page.posting_to')}
                    <FormControl>
                      <Select
                        onValueChange={(e) => storePost({ ...storedPost, tags: e + ' ' + storedPost.tags })}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="blog">{t('submit_page.my_blog')}</SelectItem>
                          {mySubsData?.map((e) => (
                            <SelectItem key={e[0]} value={e[0]}>
                              {e[1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="redHover"
              disabled={!storedPost?.title || storedPost.tags.length === 0}
            >
              {t('submit_page.submit')}
            </Button>
            <Button
              onClick={() => {
                form.reset(defaultValues);
              }}
              variant="ghost"
              className="font-thiny text-foreground/60 hover:text-destructive"
            >
              {t('submit_page.clean')}
            </Button>
          </form>
        </Form>
        <div
          className={clsx('flex h-fit flex-col gap-4 lg:w-1/2', {
            hidden: !preview,
            'lg:w-full': !sideBySide
          })}
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

          {watchedValues.postArea && hiveRenderer ? (
            <div
              dangerouslySetInnerHTML={{
                __html: hiveRenderer.render(watchedValues.postArea)
              }}
              className="prose h-fit self-center break-words border-2 border-border p-2 dark:prose-invert"
            ></div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
