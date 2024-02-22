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
} from '@hive/ui/components/alert-dialog';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Input } from '@ui/components';
import { ReactNode, useState } from 'react';
import { transactionService } from '@transaction/index';
import { CommunityOperationBuilder } from '@hive/wax/web';
import { useSigner } from '@/blog/components/hooks/use-signer';

export function AlertDialogFlag({
  children,
  community,
  username,
  permlink
}: {
  children: ReactNode;
  community: string;
  username: string;
  permlink: string;
}) {
  const { user } = useUser();
  const { signerOptions } = useSigner();
  const [notes, setNotes] = useState('');

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl ">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="flag-dialog-header">Oflaguj post</AlertDialogTitle>
            <AlertDialogCancel className="border-none hover:text-red-800" data-testid="flag-dialog-close">
              X
            </AlertDialogCancel>
          </div>
          <AlertDialogDescription data-testid="flag-dialog-description">
            Please provide a note regarding your decision to flag this post, it will be reviewed by community
            moderators.
            <Input className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="flag-dialog-cancel">
            Cancel
          </AlertDialogCancel>
          {user && user.isLoggedIn ? (
            <AlertDialogAction
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              data-testid="flag-dialog-ok"
              onClick={() => {
                transactionService.processHiveAppOperation((builder) => {
                  builder.push(
                    new CommunityOperationBuilder()
                      .flagPost(community, username, permlink, notes)
                      .authorize(user.username)
                      .build()
                  );
                }, signerOptions);
              }}
            >
              OK
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
