import { Button, Separator } from "@hive/ui";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@hive/ui/components/alert-dialog";
import { ReactNode, useState } from "react";
import { useTranslation } from 'next-i18next';
import { create } from 'react-modal-promise';

export function AlertDialogPassword({
  children,
  isOpen,
  onResolve,
  onReject,
  title,
  i18nNamespace = 'smart-signer',
}: {
  children: ReactNode;
  isOpen: boolean,
  onResolve: any,
  onReject: any,
  title: string,
  i18nNamespace?: string;
}) {
  const { t } = useTranslation(i18nNamespace);
  const [open, setOpen] = useState(isOpen);
  const [wif, setWif] = useState('');
  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl ">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle>
              {title}
            </AlertDialogTitle>
            <AlertDialogCancel
              className="border-none hover:text-red-800"
            >
              <span onClick={() => onReject('rejected')}>X</span>
            </AlertDialogCancel>
          </div>
          <Separator />
          <AlertDialogDescription>
          <input
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500 dark:text-slate-300"
              placeholder={t('login_form.password_placeholder')}
              autoComplete="current-password"
              onBlur={(evt) => { setWif(evt.target.value) }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <Button onClick={() => onResolve(wif)}>Confirm modal</Button>
          <Button onClick={() => onReject('rejected')}>Reject modal</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const myPromiseModal = create(AlertDialogPassword);
