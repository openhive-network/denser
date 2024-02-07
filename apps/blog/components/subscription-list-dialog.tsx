import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';

import { Subscription } from '@ui/lib/bridge';
import Link from 'next/link';
import { ReactNode } from 'react';

export function SubsListDialog({
  children,
  subs,
  title
}: {
  children: ReactNode;
  subs: Subscription[];
  title: string;
}) {
  return (
    <Dialog>
      <DialogTrigger className="cursor-pointer" asChild>
        {children}
      </DialogTrigger>
      <DialogContent className=" h-5/6 overflow-auto sm:max-w-[425px]">
        <div>Latest {title} Subscribers</div>
        <ul>
          {subs.map((e: Subscription) => (
            <li key={e[0]} className="p-[1.5px] text-sm text-red-500">
              <Link href={`@${e[0]}`}>@{e[0]}</Link>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
