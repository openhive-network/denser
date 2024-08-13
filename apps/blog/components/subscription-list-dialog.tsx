import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';

import type { Subscription } from '@transaction/lib/bridge';
import Link from 'next/link';
import { ReactNode } from 'react';
import { Badge } from '@ui/components';
import ChangeTitleDialog from './change-title-dialog';

export function SubsListDialog({
  moderateEnabled,
  children,
  subs,
  title
}: {
  moderateEnabled: boolean;
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
            <li key={e[0]} className="flex items-center gap-1 p-[1.5px] text-sm">
              <Link href={`@${e[0]}`} className="text-destructive">
                @{e[0]}
              </Link>
              <span className="text-xs font-thin">{e[1] !== 'guest' ? e[1].toLocaleUpperCase() : null}</span>
              {e[2] ? (
                <Badge className="font-light" variant="red">
                  {e[2]}
                  <ChangeTitleDialog moderateEnabled={moderateEnabled} userOnList={e[0]} />
                </Badge>
              ) : (
                <ChangeTitleDialog moderateEnabled={moderateEnabled} userOnList={e[0]} />
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
