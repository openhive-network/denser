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
import { Input, Separator } from '@ui/components';
import { ReactNode, useState } from 'react';
import ln2list from '../lib/ln2list';
import { useTranslation } from 'next-i18next';
import { useFlagMutation } from './hooks/use-flag-mutation';
import { handleError } from '@ui/lib/utils';

export function AlertDialogFlag({
  children,
  community,
  username,
  permlink,
  flagText
}: {
  children: ReactNode;
  community: string;
  username: string;
  flagText: string;
  permlink: string;
}) {
  const { user } = useUser();
  const [notes, setNotes] = useState('');
  const { t } = useTranslation();
  const flagMutation = useFlagMutation();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="flag-dialog-header">
              {t('post_content.flag.flag_post')}
            </AlertDialogTitle>
            <AlertDialogCancel className="border-none hover:text-red-800" data-testid="flag-dialog-close">
              X
            </AlertDialogCancel>
          </div>
          <AlertDialogDescription className="flex flex-col gap-2" data-testid="flag-dialog-description">
            <div>{t('post_content.flag.flag_description')}</div>

            <Separator />
            <h1 className="text-lg font-bold">{t('post_content.flag.community_rules')}</h1>
            {ln2list(flagText).map((x, i) => (
              <p key={i + 1}>{`${i + 1}. ${x}`}</p>
            ))}
            <Separator />

            <Input className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="flag-dialog-cancel">
            {t('post_content.flag.cancel')}
          </AlertDialogCancel>
          {user && user.isLoggedIn ? (
            <AlertDialogAction
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              data-testid="flag-dialog-ok"
              onClick={() => {
                try {
                  flagMutation.mutateAsync({ community, username, permlink, notes });
                } catch (error) {
                  handleError(error, {
                    method: 'flag',
                    community,
                    username,
                    permlink,
                    notes
                  });
                }
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
