import Link from 'next/link';
import { Textarea } from '@hive/ui/components/textarea';
import { Button } from '@hive/ui/components/button';
import { useState } from 'react';
import { Label } from '@radix-ui/react-label';
import { Input } from '@hive/ui/components/input';

export function ReplyTextbox({ onSetReply }: { onSetReply: (e: boolean) => void }) {
  const [text, setText] = useState('');
  const handleCancel = () => {
    if (text === '') return onSetReply(false);
    const confirmed = confirm('Are you sure you want to exit the comment editor?');
    if (confirmed) {
      onSetReply(false);
    }
  };

  return (
    <div className="mx-8 mb-4 flex flex-col gap-6 rounded-md border bg-card p-4 text-card-foreground shadow-sm dark:bg-slate-900" data-testid="reply-editor">
      <div className="flex flex-col gap-4">
        <Link href={`#`}>
          <h1 className="text-sm text-red-500">Disable side-by-side editor</h1>
        </Link>
        <div>
          <Textarea
            className="border-2 border-slate-200 dark:text-white"
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply"
          />
          <p className="border-2 border-t-0 border-slate-200 bg-gray-100 p-1 text-xs font-light text-slate-500 dark:border-black dark:bg-slate-950">
            Insert images by dragging & dropping, pasting from the clipboard, or by{' '}
            <span>
              <Label className="cursor-pointer text-red-500" htmlFor="picture">
                selecting them
              </Label>
              <Input id="picture" type="file" className="hidden" />
            </span>
            .
          </p>
        </div>
        <div className="flex flex-col md:flex-row">
          <Button disabled={text === ''}>Post</Button>
          <Button
            variant="ghost"
            onClick={() => handleCancel()}
            className="font-thiny text-slate-500 hover:text-red-500"
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Preview</span>
          <Link href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">
            <span className="text-red-500">Markdown Styling Guide</span>
          </Link>
        </div>
        {text ? (
          <div
            dangerouslySetInnerHTML={{
              __html: text
            }}
            className="prose max-w-full border-2 border-slate-200 p-2 dark:prose-invert"
          ></div>
        ) : null}
      </div>
    </div>
  );
}
