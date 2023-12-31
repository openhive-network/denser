import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';
import NotificationActivities from './notification-activities';
import type { ReactNode } from 'react';
import { AccountNotification } from '@/blog/lib/bridge';

export function ActivityLogDialog({
  children,
  data,
  username
}: {
  children: ReactNode;
  data: AccountNotification[] | null | undefined;
  username: string;
}) {
  return (
    <Dialog>
      <DialogTrigger>
        <div className="cursor-pointer text-red-500">{children}</div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2/3 h-5/6 overflow-auto px-1 pt-1">
        {' '}
        <NotificationActivities data={data} username={username} />
      </DialogContent>
    </Dialog>
  );
}
