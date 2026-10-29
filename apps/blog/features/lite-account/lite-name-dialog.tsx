'use client';

import { Button } from '@ui/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Input } from '@ui/components/input';
import { cn } from '@ui/lib/utils';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/blog/i18n/client';
import { useLitePasskeyAccess } from './use-lite-passkey';
import { canConfirmLiteName, type LiteNameState } from './lite-name-availability';
import { useLiteNameField } from './use-lite-name-field';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  /** A name the gateway refused as taken at posting time: the dialog reopens on it, saying so. */
  takenName?: string;
  /** What the guest is about to post: names the "sign in instead" action. */
  purpose: 'reply' | 'post';
  /** Leaves the guest flow for the sign-in dialog; whatever the guest typed is kept. */
  onSignIn: () => void;
};

const LiteSignInDialog = dynamic(() => import('./lite-sign-in-dialog'), { ssr: false });

const SIGN_IN_KEYS: Record<Props['purpose'], string> = {
  reply: 'lite_account.name_dialog.sign_in_reply',
  post: 'lite_account.name_dialog.sign_in_post'
};

const STATE_MESSAGE_KEYS: Record<LiteNameState, string> = {
  invalid: 'lite_account.name_dialog.invalid_name',
  checking: 'lite_account.name_dialog.checking',
  available: 'lite_account.name_dialog.available',
  taken: 'lite_account.name_dialog.taken',
  taken_lite: 'lite_account.name_dialog.taken_lite',
  taken_l1: 'lite_account.name_dialog.taken_l1',
  invalid_l1: 'lite_account.name_dialog.invalid_l1',
  check_failed: 'lite_account.name_dialog.check_failed'
};

const stateTone = (state: LiteNameState): string => {
  if (state === 'available') return 'text-green-600 dark:text-green-400';
  if (state === 'checking' || state === 'check_failed') return 'text-muted-foreground';
  return 'text-destructive';
};

/** The dialog's body, mounted on each opening: a fresh suggestion (or the refused name) every time. */
function LiteNameForm({ onCancel, onConfirm, takenName }: { onCancel: () => void; onConfirm: (name: string) => void; takenName?: string }) {
  const { t } = useTranslation('common_blog');
  const { name, state, edit, suggest } = useLiteNameField(takenName);

  return (
    <>
      <div className="flex flex-col gap-2">
        <label className="text-sm" htmlFor="lite-name">
          {t('lite_account.name_dialog.label')}
        </label>
        <div className="flex gap-2">
          <Input id="lite-name" value={name} onChange={(e) => edit(e.target.value.trim().toLowerCase())} data-testid="lite-name-input" />
          <Button type="button" variant="outline" onClick={() => void suggest()} data-testid="lite-name-suggest">
            {t('lite_account.name_dialog.suggest_another')}
          </Button>
        </div>
        <p className={cn('text-xs', stateTone(state))} role="status" data-state={state} data-testid="lite-name-status">
          {t(STATE_MESSAGE_KEYS[state])}
        </p>
        <p className="text-xs text-muted-foreground">{t('lite_account.name_dialog.disposable_note')}</p>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('lite_account.name_dialog.cancel')}
        </Button>
        <Button type="button" disabled={!canConfirmLiteName(state)} onClick={() => onConfirm(name)} data-testid="lite-name-confirm">
          {t('lite_account.name_dialog.confirm')}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * First-post name prompt: a suggested adjective-noun-number handle the gateway says is free,
 * overridable, with the name's availability checked as the user types (design doc §2 step 3).
 * Where the gateway relays authority edits, a guest whose lite account is secured with a passkey
 * signs in to it on this device instead.
 */
export default function LiteNameDialog({ open, onOpenChange, onConfirm, takenName, purpose, onSignIn }: Props) {
  const { t } = useTranslation('common_blog');
  const passkey = useLitePasskeyAccess().available;
  const [isPasskeySignInOpen, setIsPasskeySignInOpen] = useState(false);
  const signInOnDevice = () => {
    onOpenChange(false);
    setIsPasskeySignInOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[420px]" data-testid="lite-name-dialog">
          <DialogHeader>
            <DialogTitle>{t('lite_account.name_dialog.title')}</DialogTitle>
            <DialogDescription>{t('lite_account.name_dialog.description')}</DialogDescription>
          </DialogHeader>
          <LiteNameForm onCancel={() => onOpenChange(false)} onConfirm={onConfirm} takenName={takenName} />
          <Button type="button" variant="link" className="h-auto justify-start whitespace-normal p-0 text-left text-sm" onClick={onSignIn} data-testid="lite-name-sign-in">
            {t(SIGN_IN_KEYS[purpose])}
          </Button>
          {passkey ? (
            <Button
              type="button"
              variant="link"
              className="h-auto justify-start whitespace-normal p-0 text-left text-sm"
              onClick={signInOnDevice}
              data-testid="lite-name-sign-in-device"
            >
              {t('lite_account.passkey.sign_in_on_device')}
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
      {passkey && isPasskeySignInOpen ? <LiteSignInDialog open onOpenChange={setIsPasskeySignInOpen} /> : null}
    </>
  );
}
