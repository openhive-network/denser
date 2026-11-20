'use client';

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
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { ReactNode, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/blog/i18n/client';

export function PostDeleteDialog({
  children,
  permlink,
  action,
  kind
}: {
  children: ReactNode;
  permlink: string;
  action: (permlink: string) => void;
  kind: 'post' | 'comment';
}) {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const [open, setOpen] = useState(false);
  const title = kind === 'post' ? t('post_content.delete_dialog.title_post') : t('post_content.delete_dialog.title_comment');

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl ">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="flag-dialog-header">{title}</AlertDialogTitle>
            <AlertDialogCancel
              className="border-none hover:text-red-800"
              aria-label={t('global.close')}
              data-testid="flag-dialog-close"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </AlertDialogCancel>
          </div>
          <AlertDialogDescription data-testid="flag-dialog-description">
            {t('post_content.delete_dialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="flag-dialog-cancel">
            {t('post_content.delete_dialog.cancel')}
          </AlertDialogCancel>
          {user && user.isLoggedIn ? (
            <AlertDialogAction
              autoFocus
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              data-testid="flag-dialog-ok"
              onClick={(e) => {
                e.preventDefault();
                action(permlink);
                setOpen(false);
              }}
            >
              {t('post_content.flag.ok')}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
