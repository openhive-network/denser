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
import { Input, Separator } from '@ui/components';
import { ReactNode, useState } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { handleError } from '@ui/lib/utils';
import { useFlagMutation } from '@/blog/components/hooks/use-flag-mutation';
import ln2list from '@/blog/lib/ln2list';

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
  const { user } = useUserClient();
  const [notes, setNotes] = useState('');
  const { t } = useTranslation('common_blog');
  const flagMutation = useFlagMutation();

  const flag = async () => {
    try {
      await flagMutation.mutateAsync({ community, username, permlink, notes });
    } catch (error) {
      handleError(error, { method: 'flag', params: { community, username, permlink, notes } });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="flag-dialog-header">
              {t('post_content.flag.flag_post')}
            </AlertDialogTitle>
            <AlertDialogCancel className="border-none hover:text-destructive" data-testid="flag-dialog-close">
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
          <AlertDialogCancel className="hover:text-destructive" data-testid="flag-dialog-cancel">
            {t('post_content.flag.cancel')}
          </AlertDialogCancel>
          {user && user.isLoggedIn ? (
            <AlertDialogAction
              className="rounded-none bg-foreground text-secondary shadow-lg shadow-destructive hover:bg-destructive hover:shadow-foreground disabled:bg-gray-400 disabled:shadow-none"
              data-testid="flag-dialog-ok"
              onClick={flag}
            >
              {t('post_content.flag.ok')}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
