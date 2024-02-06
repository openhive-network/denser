import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';
import { ReactNode, SyntheticEvent, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { isBrowser, AuthUser } from '@hive/hb-auth';
import type { KeyAuthorityType } from '@hive/hb-auth';
import { toast } from '@ui/components/hooks/use-toast';
import { create } from 'react-modal-promise';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

interface DialogPasswordProps {
  children: ReactNode;
  isOpen: boolean;
  onResolve: any;
  onReject: any;
  title: string;
  i18nNamespace?: string;
}

export function DialogPassword({
  children,
  isOpen = false,
  onResolve,
  onReject,
  title,
  i18nNamespace = 'smart-signer',
}: DialogPasswordProps) {
  const { t } = useTranslation(i18nNamespace);
  const [open, setOpen] = useState(isOpen);
  const [password, setPassword] = useState('');

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const target = e.target as unknown as HTMLFormElement;
    const form = new FormData(e.target as HTMLFormElement);
    const password = form.get('password') as string;
    setPassword(password);
    logger.info('password: %s', password);
    // target.reset();
    setOpen(false);
    onResolve(password);
  }

  function onOpenChange(value: boolean) {
    logger.info('in onOpenChange', value);
    setOpen(value);
    if (password) {
      onResolve(password);
    } else {
      onReject('rejected');
    }
  }

  const onInteractOutside = (e: any) => {
    e.preventDefault();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={onInteractOutside}>
        <div className="flex h-screen flex-col justify-start pt-16 sm:h-fit md:justify-center md:pt-0">
          <div className="mx-auto flex w-full max-w-md flex-col items-center">
            <h2 className="w-full pb-6 text-3xl text-gray-800">
              {t('login_form.title_hbauth_form')}
              {t('login_form.title_action_unlock_key')}
            </h2>
            <form onSubmit={handleSubmit} className="w-full" name="login">
              <div className="mb-5">
                <input
                  autoComplete="current-password"
                  type="password"
                  id="password"
                  name="password"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-red-500"
                  placeholder="Password"
                  // required
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="w-fit rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:cursor-pointer hover:bg-red-700 focus:outline-none  disabled:bg-gray-400 disabled:hover:cursor-not-allowed"
                >
                  {t('login_form.login_button')}
                </button>
                <button
                  type="reset"
                  className="w-fit rounded-lg bg-transparent px-5 py-2.5 text-center text-sm font-semibold text-gray-500 hover:cursor-pointer hover:text-red-600 focus:outline-none"
                >
                  {t('login_form.reset_button')}
                </button>
              </div>
            </form>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

export const DialogPasswordModalPromise = create(DialogPassword);
