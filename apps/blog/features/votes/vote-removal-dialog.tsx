'use client';

import { ReactNode, useState } from 'react';
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
import { useTranslation } from '@/blog/i18n/client';

export function VoteRemovalDialog({
  children,
  voteType,
  onConfirm
}: {
  children: ReactNode;
  voteType: 'upvote' | 'downvote';
  onConfirm: () => void;
}) {
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);

  const title =
    voteType === 'upvote'
      ? t('vote_removal_dialog.remove_upvote_title')
      : t('vote_removal_dialog.remove_downvote_title');

  const description =
    voteType === 'upvote'
      ? t('vote_removal_dialog.remove_upvote_description')
      : t('vote_removal_dialog.remove_downvote_description');

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-8 sm:rounded-r-xl">
        <AlertDialogHeader className="gap-2">
          <div className="flex items-center justify-between">
            <AlertDialogTitle data-testid="vote-removal-dialog-header">{title}</AlertDialogTitle>
            <AlertDialogCancel
              className="border-none hover:text-red-800"
              data-testid="vote-removal-dialog-close"
            >
              X
            </AlertDialogCancel>
          </div>
          <AlertDialogDescription data-testid="vote-removal-dialog-description">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="vote-removal-dialog-cancel">
            {t('vote_removal_dialog.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            autoFocus
            className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-destructive hover:bg-destructive hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
              setOpen(false);
            }}
            data-testid="vote-removal-dialog-ok"
          >
            {t('vote_removal_dialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
