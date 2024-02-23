import { Button, Separator } from '@hive/ui';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@ui/components/alert-dialog';
import { ReactNode } from 'react';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';

export function AlertDialogProxy({ children, userProxy }: { children: ReactNode; userProxy: string }) {
  const { t } = useTranslation('common_wallet');
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl ">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="reblog-dialog-header">
              {t('witnesses_page.proxy_form.title')}
            </AlertDialogTitle>
            <AlertDialogCancel className="border-none hover:text-red-800" data-testid="reblog-dialog-close">
              X
            </AlertDialogCancel>
          </div>
          <Separator />
          <AlertDialogDescription data-testid="reblog-dialog-description">
            {userProxy === ''
              ? t('witnesses_page.proxy_form.description')
              : t('witnesses_page.proxy_form.set_proxy_to', { proxy: userProxy })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="reblog-dialog-cancel">
            {t('witnesses_page.proxy_form.cancel_button')}
          </AlertDialogCancel>
          <DialogLogin>
            <Button
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              data-testid="reblog-dialog-ok"
            >
              {t('witnesses_page.proxy_form.ok')}
            </Button>
          </DialogLogin>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
