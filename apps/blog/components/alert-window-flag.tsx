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
import { CommunityOperationBuilder } from '@hive/wax/web';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Signer } from '@smart-signer/lib/signer';
import { Input } from '@ui/components';
import { toast } from '@ui/components/hooks/use-toast';
import { logger } from '@ui/lib/logger';
import { ReactNode, useState } from 'react';

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
  const [notes, setNotes] = useState('');

  async function flag() {
    if (user && user.isLoggedIn) {
      const customJsonOperations: any[] = [];
      new CommunityOperationBuilder()
        .flagPost(community, username, permlink, notes)
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
          <AlertDialogAction
            className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
            data-testid="flag-dialog-ok"
            onClick={flag}
          >
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
