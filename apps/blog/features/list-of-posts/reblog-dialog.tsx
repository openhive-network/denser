'use client';

import { ReactNode, useState } from 'react';
import { CircleSpinner } from 'react-spinners-kit';
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
import { Button } from '@ui/components/button';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import DialogLogin from '@/blog/components/dialog-login';
import { useTranslation } from '@/blog/i18n/client';
import { useRebloggedByQuery } from './hooks/use-reblogged-by-query';

export function ReblogDialog({
  children,
  author,
  permlink,
  action,
  isReblogged: isRebloggedProp
}: {
  children: ReactNode;
  author: string;
  permlink: string;
  action: (dialogResponse: boolean) => void;
  /** Optional: skip the query if reblog status is already known */
  isReblogged?: boolean;
}) {
  const { user } = useUserClient();
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);

  // Check reblog status only when the dialog is open (lazy query).
  // Skip if the parent already provides the status via isRebloggedProp.
  const needsQuery = open && isRebloggedProp === undefined;
  const { data: isRebloggedQuery, isLoading: isCheckingReblog } = useRebloggedByQuery(
    needsQuery ? author : '',
    needsQuery ? permlink : '',
    needsQuery ? user.username : ''
  );
  const isReblogged = isRebloggedProp ?? isRebloggedQuery;
  // Disable the OK button while checking reblog status (only when dialog does its own query)
  const shouldDisableAction = isReblogged || (needsQuery && isCheckingReblog);

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
            {isReblogged
              ? t('alert_dialog_reblog.already_reblogged')
              : t('alert_dialog_reblog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="reblog-dialog-cancel">
            {t('alert_dialog_reblog.cancel')}
          </AlertDialogCancel>
          {user && user.isLoggedIn ? (
            <AlertDialogAction
              autoFocus
              disabled={shouldDisableAction}
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-destructive hover:bg-destructive hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              onClick={(e) => {
                e.preventDefault();
                action(true);
                setOpen(false);
              }}
              data-testid="reblog-dialog-ok"
            >
              {needsQuery && isCheckingReblog ? (
                <span className="flex items-center gap-2">
                  <CircleSpinner loading size={14} color="#ffffff" />
                  {t('global.loading')}
                </span>
              ) : (
                t('alert_dialog_reblog.action')
              )}
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
