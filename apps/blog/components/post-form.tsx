import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Textarea } from '@ui/components/textarea';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { Label } from '@radix-ui/react-label';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@ui/components/form';
import { useForm } from 'react-hook-form';
import useManabars from './hooks/useManabars';
import { AdvancedSettingsPostForm } from './advanced_settings_post_form';
import MdEditor from './md-editor';

const accountFormSchema = z.object({
  title: z.string().min(2, { message: '' }),
  postArea: z.string().min(1, { message: '' }),
  postSummary: z.string().max(140, { message: '' }),
  tags: z.string(),
  author: z.string().regex(/^$|^[[a-zAZ1-9]+$/, 'Must contain only letters and numbers'),
  // author: z.string(),
  category: z.string({ required_error: '' })
});
type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function PostForm({ username }: { username: string }) {
  const { manabarsData } = useManabars(username);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      title: '',
      postArea: '',
      postSummary: '',
      tags: '',
      author: '',
      category: 'myBlog'
    }
  });
  function onSubmit(data: AccountFormValues) {
    console.log(JSON.stringify(data, null, 2));
  }

  return (
    <div className="sm:flex-ro flex flex-col gap-4 bg-gray-50 p-8 dark:bg-slate-950">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <h1 className="text-sm text-red-500">Disable side-by-side editor</h1>
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
                <FormDescription className="border-x-2 border-b-2 border-slate-200 px-3 pb-1 text-xs text-slate-500 dark:border-slate-900">
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
          />{' '}
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="enter your tags separated by a space" {...field} />
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
              <span className="cursor-pointer text-xs text-red-500">Advanced settings</span>
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
                          <SelectValue placeholder="Select a verified email to display" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="myBlog">My blog</SelectItem>
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
            onClick={() => form.reset()}
            variant="ghost"
            className="font-thiny text-slate-500 hover:text-red-500"
          >
            Clean
          </Button>
        </form>
      </Form>
      <div className="flex h-fit flex-col gap-4">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between">
          <span className="text-slate-500">Preview</span>
          <Link href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">
            <span className="text-sm text-red-500">Markdown Styling Guide</span>
          </Link>
        </div>

        {form.watch('postArea') ? (
          <div
            dangerouslySetInnerHTML={{
              __html: form.watch('postArea')
            }}
            className="prose h-fit break-words border-2 border-slate-200 p-2 dark:prose-invert"
          ></div>
        ) : null}
      </div>
    </div>
  );
}
