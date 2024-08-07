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
import { ReactNode, useState, KeyboardEvent } from 'react';
import DialogLogin from './dialog-login';
import { Button } from '@ui/components/button';
import { useTranslation } from 'next-i18next';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

export function ReblogDialog({
  children,
  action
}: {
  children: ReactNode;
  author: string;
  permlink: string;
  action: (dialogResponse: boolean) => void;
}) {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl ">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="reblog-dialog-header">
              {t('alert_dialog_reblog.title')}
            </AlertDialogTitle>
            <AlertDialogCancel className="border-none hover:text-red-800" data-testid="reblog-dialog-close">
              X
            </AlertDialogCancel>
          </div>
          <AlertDialogDescription data-testid="reblog-dialog-description">
            {t('alert_dialog_reblog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="reblog-dialog-cancel">
            {t('alert_dialog_reblog.cancel')}
          </AlertDialogCancel>
          {user && user.isLoggedIn ? (
            <AlertDialogAction
              autoFocus
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-destructive hover:bg-destructive hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              onClick={(e) => {
                e.preventDefault();
                action(true);
                setOpen(false);
              }}
            >
              {t('alert_dialog_reblog.action')}
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
