import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Icons } from './icons';
import { ReactNode } from 'react';
import Link from 'next/link';
import ClipboardCopy from './copy-from-imput';

export function SharePost({ children, path }: { children: ReactNode; path: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="flex flex-col gap-4 sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="border-b-2 pb-2 text-3xl">Share this post</DialogTitle>
        </DialogHeader>
        <div className="flex w-full flex-col gap-4">
          <ClipboardCopy copyText={`https://hive.blog${path}`} label="URL to this post:" />
          <ClipboardCopy
            copyText={`[Call to Action! - Recording of the Last Meeting & Participate in SPK Proof of Access](https://hive.blog${path})`}
            label="Markdown code for a link to this post:"
          />
        </div>
        <div>
          <div className="flex flex-col gap-1 text-sm">
            <DialogTitle className="my-2">Open in alternative Hive dApps</DialogTitle>
            <Link target="_blank" className="flex gap-2" href={`https://peakd.com${path}`}>
              {'•'}
              <span className="text-red-600">https://peakd.com</span>
              <Icons.forward />
            </Link>
            <Link target="_blank" href={`https://ecency.com${path}`} className="flex gap-2">
              {'•'}
              <span className="text-red-600">https://ecency.com</span>
              <Icons.forward />
            </Link>
            <Link target="_blank" href={`https://waivio.com${path}`} className="flex gap-2">
              {'•'} <span className="text-red-600">https://waivio.com </span>
              <Icons.forward />
            </Link>
          </div>
        </div>
        <div>
          <div className="flex flex-col gap-1 text-sm">
            <DialogTitle className="my-2">Open in block explorers</DialogTitle>
            <Link target="_blank" className="flex gap-2" href={`https://hiveblocks.com${path}`}>
              {'•'} <span className="text-red-600">https://hiveblocks.com </span>
              <Icons.forward />
            </Link>
            <Link target="_blank" href={`https://hive.ausbit.dev${path}`} className="flex gap-2">
              {'•'} <span className="text-red-600">https://hive.ausbit.dev </span>
              <Icons.forward />
            </Link>
            <Link target="_blank" href={`https://hiveblockexplorer.com${path}`} className="flex gap-2">
              {'•'} <span className="text-red-600">https://hiveblockexplorer.com </span>
              <Icons.forward />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
