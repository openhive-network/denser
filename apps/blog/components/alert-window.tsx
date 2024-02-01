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
import { FollowOperationBuilder } from '@hive/wax/web';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Signer } from '@smart-signer/lib/signer';
import { toast } from '@ui/components/hooks/use-toast';
import { logger } from '@ui/lib/logger';
import { useParams } from 'next/navigation';
import { ReactNode } from 'react';

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

  async function reblog() {
    if (user && user.isLoggedIn) {
      const customJsonOperations: any[] = [];
      new FollowOperationBuilder()
        .reblog(user.username, username, permlink)
        .authorize(user.username)
        .build()
        .flushOperations(customJsonOperations);

      const signer = new Signer();
      try {
        await signer.broadcastTransaction({
          operation: customJsonOperations[0],
          loginType: user.loginType,
          username: user.username
        });
      } catch (e) {
        //
        // TODO Improve messages displayed to user, after we do better
        // (unified) error handling in smart-signer.
        //
        logger.error('got error', e);
        let description = 'Transaction broadcast error';
        if (`${e}`.indexOf('vote on this comment is identical') >= 0) {
          description = 'Your current vote on this comment is identical to this vote.';
        } else if (`${e}`.indexOf('Not implemented') >= 0) {
          description = 'Method not implemented for this login type.';
        }
        toast({
          description,
          variant: 'destructive'
        });
      }
    }
  }

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
          <AlertDialogAction
            className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
            data-testid="reblog-dialog-ok"
            onClick={reblog}
          >
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
