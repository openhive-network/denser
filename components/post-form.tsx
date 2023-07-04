import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@radix-ui/react-label';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';

const accountFormSchema = z.object({
  title: z.string().min(2, { message: '' }),
  postArea: z.string().min(2, { message: '' }),
  unknow1: z.string().min(2, { message: '' }),
  unknow2: z.string().min(2, { message: '' }),
  unknow3: z.string().min(2, { message: '' }),
  category: z.string({ required_error: '' })
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function PostForm() {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      title: '',
      postArea: '',
      unknow1: '',
      unknow2: '',
      unknow3: '',
      category: '1'
    }
  });
  function onSubmit(data: AccountFormValues) {
    console.log(JSON.stringify(data, null, 2));
  }

  return (
    <div className="flex flex-col gap-4 bg-gray-50 p-8 dark:bg-slate-950 sm:flex-row">
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
                  <Textarea placeholder="Post content" {...field} />
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
            name="unknow1"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="IDK1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />{' '}
          <FormField
            control={form.control}
            name="unknow2"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="IDK2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />{' '}
          <FormField
            control={form.control}
            name="unknow3"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="IDK3" className="w-1/2" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                {' '}
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
                        <SelectItem value="1">My blog1</SelectItem>
                        <SelectItem value="2">My blog2</SelectItem>
                        <SelectItem value="3">My blog3</SelectItem>
                        <SelectItem value="4">My blog4</SelectItem>
                        <SelectItem value="5">My blog5</SelectItem>
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
      <div className="flex h-fit w-1/2 flex-col gap-4">
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
            className="prose h-fit max-w-full break-words border-2 border-slate-200 p-2  dark:prose-invert"
          ></div>
        ) : null}
      </div>
    </div>
  );
}
