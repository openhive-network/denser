'use client';

import { ChangeEvent, MouseEvent, useState } from 'react';
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
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { useTranslation } from '@/blog/i18n/client';

/** "Unfollow all" button whose dialog only confirms once the owner types their own account name. */
export function UnfollowAllDialog({
  username,
  count,
  disabled,
  onConfirm
}: {
  username: string;
  count: number;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(false);
  const [typedName, setTypedName] = useState('');
  const nameMatches = typedName.trim().toLowerCase() === username;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setTypedName('');
  };
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => setTypedName(e.target.value);
  const handleConfirm = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!nameMatches) return;
    onConfirm();
    handleOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outlineRed"
          className="self-center text-xs"
          disabled={disabled}
          data-testid="unfollow-all-button"
        >
          {t('user_profile.lists.list.unfollow_all.button')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="flex flex-col gap-6 sm:rounded-r-xl" data-testid="unfollow-all-dialog">
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle>{t('user_profile.lists.list.unfollow_all.title')}</AlertDialogTitle>
          <AlertDialogDescription data-testid="unfollow-all-dialog-description">
            {t('user_profile.lists.list.unfollow_all.description', { count })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex flex-col gap-2 text-sm">
          {t('user_profile.lists.list.unfollow_all.confirm_prompt', { username })}
          <Input
            value={typedName}
            onChange={handleNameChange}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            data-testid="unfollow-all-dialog-input"
          />
        </label>
        <AlertDialogFooter className="gap-2 sm:flex-row-reverse">
          <AlertDialogCancel className="hover:text-red-800" data-testid="unfollow-all-dialog-cancel">
            {t('user_profile.lists.list.unfollow_all.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-none bg-gray-800 text-base text-white shadow-lg shadow-destructive hover:bg-destructive hover:shadow-gray-800 disabled:bg-gray-400 disabled:shadow-none"
            disabled={!nameMatches}
            onClick={handleConfirm}
            data-testid="unfollow-all-dialog-confirm"
          >
            {t('user_profile.lists.list.unfollow_all.button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
