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
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useLocalStorage } from './hooks/use-local-storage';

const accountFormSchema = z.object({
  title: z.string().min(2),
  postArea: z.string().min(1),
  postSummary: z.string().max(140),
  tags: z.string(),
  author: z.string().regex(/^$|^[[a-zAZ1-9]+$/, 'Must contain only letters and numbers'),
  category: z.string()
});
type AccountFormValues = z.infer<typeof accountFormSchema>;

const defaultValues = {
  title: '',
  postArea: '',
  postSummary: '',
  tags: '',
  author: '',
  category: 'blog'
};
const getValues = (storedPost?: AccountFormValues) => ({
  title: storedPost?.title ?? '',
  postArea: storedPost?.postArea ?? '',
  postSummary: storedPost?.postSummary ?? '',
  tags: storedPost?.tags ?? '',
  author: storedPost?.author ?? '',
  category: storedPost?.category ?? 'blog'
});

export default function PostForm({ username }: { username: string }) {
  const [preview, setPreview] = useState(false);
  const { manabarsData } = useManabars(username);

  const [storedPost, storePost] = useLocalStorage<AccountFormValues>('postData', defaultValues);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    values: getValues(storedPost)
  });
  const watchedValues = form.watch();

  useEffect(() => {
    storePost(watchedValues);
  }, [JSON.stringify(watchedValues)]);

  function onSubmit(data: AccountFormValues) {
    console.log(JSON.stringify(data, null, 2));
    storePost(defaultValues);
  }
  return (
    <div className="flex flex-col gap-4 bg-gray-50 p-8 dark:bg-slate-950 sm:flex-row">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={clsx('space-y-8 md:w-1/2', { 'md:w-full': !preview })}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-sm text-destructive">Disable side-by-side editor</h1>
            <Button
              onClick={() => setPreview((prev) => !prev)}
              variant="link"
              className="hover:text-destructive"
            >
              {preview ? 'Hide' : 'Show'} preview
            </Button>
          </div>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Title" {...field} />
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
                  Insert images by dragging & dropping, pasting from the clipboard, or by{' '}
                  <span>
                    <Label className="cursor-pointer text-red-500" htmlFor="picture">
                      selecting them
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
                  <Input placeholder="Post summary(for posts & SEO, max 140 chars)" {...field} />
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
                  <Input placeholder="Enter your tags separated by a space" {...field} />
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
                  <Input placeholder="Author(if different from current account)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-2">
            <span>Post options:</span>
            <span className="text-xs">Author rewards:{' 50% HBD / 50% HP'}</span>
            <AdvancedSettingsPostForm username={username}>
              <span className="cursor-pointer text-xs text-destructive">Advanced settings</span>
            </AdvancedSettingsPostForm>
          </div>
          <div className="flex flex-col gap-2">
            <span>Post options:</span>
            <span className="text-xs">Author rewards:{' ' + manabarsData?.rc.percentageValue + '%'}</span>
          </div>
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-wrap items-center gap-4">
                  Posting to:
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="blog">My blog</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
          <Button type="submit" variant="redHover">
            Submit
          </Button>
          <Button
            onClick={() => {
              form.reset(defaultValues);
            }}
            variant="ghost"
            className="font-thiny text-foreground/60 hover:text-destructive"
          >
            Clean
          </Button>
        </form>
      </Form>
      <div className={clsx('flex h-fit flex-col gap-4 md:w-1/2', { hidden: !preview })}>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between">
          <span className="text-slate-500">Preview</span>
          <Link
            target="_blank"
            href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
          >
            <span className="text-sm text-destructive">Markdown Styling Guide</span>
          </Link>
        </div>

        {watchedValues.postArea ? (
          <div
            dangerouslySetInnerHTML={{
              __html: watchedValues.postArea
            }}
            className="prose h-fit break-words border-2 border-border p-2 dark:prose-invert"
          ></div>
        ) : null}
      </div>
    </div>
  );
}
