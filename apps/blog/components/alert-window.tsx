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
import { Dispatch, ReactNode, SetStateAction, useState } from 'react';
import { transactionService } from '@transaction/index';
import DialogLogin from './dialog-login';
import { Button } from '@ui/components/button';
import { useTranslation } from 'next-i18next';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { PromiseTools } from '@transaction/lib/promise-tools'

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export function useReblogMutation() {
  const queryClient = useQueryClient();
  const reblogMutation = useMutation({
    mutationFn: async (params: {
          author: string,
          permlink: string,
          username: string
        }) => {
      const { author, permlink, username } = params;
      try {
        // await transactionService.reblog(author, permlink,
        //   (error) => { throw error; }, true);
        logger.info('Reblogged: %o',
          { author, permlink, username });

        // TODO Remove line below, when observe works in
        // TranscationService.
        await PromiseTools.promiseTimeout(7000);

      } catch (error) {
        transactionService.handleError(error);
        throw error;
      }
      return { author, permlink, username };
    },
    onSuccess: (data) => {
      logger.info('useReblogMutation onSuccess data: %o', data);
      const { author, permlink, username } = data;
      queryClient.invalidateQueries(
        { queryKey: ['PostRebloggedBy', author, permlink, username] });
      // queryClient.invalidateQueries(
      //   { queryKey: [data.permlink, data.voter, 'ActiveVotes'] });
      // queryClient.invalidateQueries(
      //   { queryKey: ['postData', data.author, data.permlink ] });
      // queryClient.invalidateQueries(
      //   { queryKey: ['entriesInfinite'] });
    },
    onError: (error) => {
      throw error;
    }
  });
  return reblogMutation;
};


export function AlertDialogReblog({
  children,
  author,
  permlink
}: {
  children: ReactNode;
  author: string;
  permlink: string;
}) {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);

  const reblogMutation = useReblogMutation();

  const reblog = async () => {
    // TODO ALternatively return answer yes/no and do action in parent.
    try {
      await reblogMutation.mutateAsync(
        { author, permlink, username: user.username }
      );
    } catch (error) {
      logger.error('Got error: %o', error);
    }
    // close dialog
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl ">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="reblog-dialog-header">{t('alert_dialog_reblog.title')}</AlertDialogTitle>
            <AlertDialogCancel className="border-none hover:text-red-800" data-testid="reblog-dialog-close">
              X
            </AlertDialogCancel>
          </div>
          <AlertDialogDescription data-testid="reblog-dialog-description">
            {t('alert_dialog_reblog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="reblog-dialog-cancel">
            {t('alert_dialog_reblog.cancel')}
          </AlertDialogCancel>
          {user && user.isLoggedIn ? (
            <AlertDialogAction
              className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-red-600 hover:bg-red-600 hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
              onClick={(e) => {
                e.preventDefault();
                reblog();
              }}
            >
              {t('alert_dialog_reblog.action')}
            </AlertDialogAction>
          ) : (
            <DialogLogin>
              <Button data-testid="reblog-dialog-ok">{t('alert_dialog_reblog.action')}</Button>
            </DialogLogin>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
