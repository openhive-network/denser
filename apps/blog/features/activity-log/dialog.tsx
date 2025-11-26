import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import NotificationActivities from './notification-content';
import { IAccountNotification } from '@transaction/lib/extended-hive.chain';

export function ActivityLogDialog({
  children,
  data,
  username
}: {
  children: ReactNode;
  data: IAccountNotification[] | null | undefined;
  username: string;
}) {
  return (
    <Dialog>
      <DialogTrigger>
        <div className="cursor-pointer text-destructive">{children}</div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2/3 h-5/6 overflow-auto px-1 pt-1">
        <NotificationActivities data={data} username={username} />
      </DialogContent>
    </Dialog>
  );
}
