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
import { ReactNode } from 'react';
import { transactionService } from '@transaction/index';
import { useSigner } from '@smart-signer/lib/use-signer';
import DialogLogin from './dialog-login';
import { Button } from '@ui/components/button';

export function AlertDialogReblog({
  children,
  username,
  permlink
}: {
  children: ReactNode;
  username: string;
  permlink: string;
}) {
  const { user } = useUser();
  const { signerOptions } = useSigner();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl ">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="reblog-dialog-header">Reblog This Post</AlertDialogTitle>
            <AlertDialogCancel className="border-none hover:text-red-800" data-testid="reblog-dialog-close">
              X
            </AlertDialogCancel>
          </div>
          <AlertDialogDescription data-testid="reblog-dialog-description">
            This post will be added to your blog and shared with your followers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="reblog-dialog-cancel">
            Cancel
          </AlertDialogCancel>
          {user && user.isLoggedIn ? (
            <AlertDialogAction
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              onClick={() => {
                transactionService.reblog(username, permlink, user, signerOptions);
              }}
            >
              OK
            </AlertDialogAction>
          ) : (
            <DialogLogin>
              <Button data-testid="reblog-dialog-ok">OK</Button>
            </DialogLogin>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
