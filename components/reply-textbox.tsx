export function TextareaDemo() {}
import Link from 'next/link';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { useState } from 'react';
import { Label } from '@radix-ui/react-label';
import { Input } from './ui/input';

export function ReplyTextbox({ onSetReply }: any) {
  const [text, setText] = useState('');
  const handleCancel = () => {
    if (text === '') return onSetReply(false);
    const confirmed = confirm('Are you sure you want to exit the comment editor?');
    if (confirmed) {
      onSetReply(false);
    }
  };

  return (
    <div className="mx-8 mb-4 flex w-5/6 flex-col gap-6 p-4 rounded-md border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-4">
        {' '}
        <Link href={`#`}>
          <h1 className="text-sm text-red-500">Disable side-by-side editor</h1>
        </Link>
        <div>
          <Textarea
            className="border-2 border-slate-200 bg-white"
            onChange={(e) => setText(e.target.value)}
            placeholder="Reply"
          />
          <p className="border-2 border-slate-200 border-t-0 text-xs text-slate-500 p-1 font-light bg-gray-100">
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
          <Button disabled={text === ''}>
            Post
          </Button>
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
        <div className="flex justify-between">
          <span className="text-slate-500">Preview</span>
          <Link href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">
            <span className="text-sm text-red-500">Markdown Styling Guide</span>
          </Link>
        </div>
        {text ? (
          <div
            dangerouslySetInnerHTML={{
              __html: text
            }}
            className="prose  max-w-full border-2 border-slate-200 p-2 dark:prose-invert"
          ></div>
        ) : null}
      </div>
    </div>
  );
}
