import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@ui/components/alert-dialog';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { ReactNode, useState } from 'react';
import DialogLogin from './dialog-login';
import { Button } from '@ui/components/button';
import { useTranslation } from 'next-i18next';
import { useReblogMutation } from './hooks/use-reblog-mutation';
import { CircleSpinner } from 'react-spinners-kit';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');


export function AlertDialogReblog({
  children,
  author,
  permlink
}: {
  children: ReactNode;
  author: string;
  permlink: string;
}) {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);

  const reblogMutation = useReblogMutation();

  const reblog = async () => {
    // TODO Alternatively return answer yes/no and do action in parent
    // (user can do other things when waiting for reblog result)
    try {
      await reblogMutation.mutateAsync(
        { author, permlink, username: user.username }
      );
    } catch (error) {
      // logger.error('Got error: %o', error);
    }
    // close dialog
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl ">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="reblog-dialog-header">{t('alert_dialog_reblog.title')}</AlertDialogTitle>
            <AlertDialogCancel
              className="border-none hover:text-red-800"
              data-testid="reblog-dialog-close"
              disabled={reblogMutation.isLoading}
              >
              X
            </AlertDialogCancel>
          </div>
          <AlertDialogDescription data-testid="reblog-dialog-description">
            {t('alert_dialog_reblog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel
            className="hover:text-red-800"
            data-testid="reblog-dialog-cancel"
            disabled={reblogMutation.isLoading}
            >
            {t('alert_dialog_reblog.cancel')}
          </AlertDialogCancel>
          {user && user.isLoggedIn ? (
            <AlertDialogAction
              disabled={reblogMutation.isLoading}
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              onClick={(e) => {
                e.preventDefault();
                reblog();
              }}
            >
              {reblogMutation.isLoading
              ?
                <CircleSpinner loading={reblogMutation.isLoading}
                  size={18} color="#dc2626" />
                :
                t('alert_dialog_reblog.action')
              }
            </AlertDialogAction>
          ) : (
            <DialogLogin>
              <Button data-testid="reblog-dialog-ok">{t('alert_dialog_reblog.action')}</Button>
            </DialogLogin>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
