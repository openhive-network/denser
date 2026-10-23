'use client';

import { useState } from 'react';
import { Button } from '@ui/components/button';
import { Checkbox } from '@ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@ui/components/dialog';
import { toast } from '@ui/components/hooks/use-toast';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { configuredPasskeySigners } from '@ui/config/public-vars';
import { useTranslation } from '@/blog/i18n/client';
import { deviceLabelGuess } from './lite-authority-state';
import LiteSignerPicker from './lite-signer-picker';
import { useStoredLiteIdentityState } from './use-stored-lite-identity';
import { useLitePasskeyAccess } from './use-lite-passkey';
import { usePasskeyFlow } from './use-passkey-flow';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

/** The dialog's body, mounted on each opening: the signer, whether to record it on chain, and this device's label. */
function LiteSecureForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('common_blog');
  const [stored, store] = useStoredLiteIdentityState();
  const { relay } = useLitePasskeyAccess();
  const { run, pending } = usePasskeyFlow(stored?.name);
  const [signer, setSigner] = useState(configuredPasskeySigners[0]);
  const [recordSigner, setRecordSigner] = useState(true);
  const [label, setLabel] = useState(() => deviceLabelGuess(navigator.userAgent));

  const secure = () => {
    if (!stored || !relay) return;
    void run(signer, async (popup) => {
      if (!popup) return;
      const { secureLiteAccount } = await import('./lite-authority-flows');
      const secured = await secureLiteAccount({
        identity: stored,
        popup,
        recordSigner,
        label: label.trim(),
        relay
      });
      store(secured);
      toast({
        title: t('lite_account.passkey.secured_title'),
        description: t('lite_account.passkey.secured_description')
      });
      onDone();
    });
  };

  return (
    <>
      <LiteSignerPicker
        signers={configuredPasskeySigners}
        value={signer}
        onValueChange={setSigner}
        disabled={pending}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="lite-secure-label">{t('lite_account.passkey.device_label')}</Label>
        <Input
          id="lite-secure-label"
          value={label}
          maxLength={64}
          disabled={pending}
          onChange={(e) => setLabel(e.target.value)}
          data-testid="lite-secure-label"
        />
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id="lite-secure-record-signer"
          checked={recordSigner}
          disabled={pending}
          onCheckedChange={(checked) => setRecordSigner(checked === true)}
          data-testid="lite-secure-record-signer"
        />
        <Label htmlFor="lite-secure-record-signer" className="text-sm font-normal leading-snug">
          {t('lite_account.passkey.record_signer')}
        </Label>
      </div>
      {pending ? (
        <p className="text-sm text-muted-foreground" role="status" data-testid="lite-secure-pending">
          {t('lite_account.passkey.working')}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" disabled={pending} onClick={onDone}>
          {t('lite_account.manage.cancel')}
        </Button>
        <Button
          type="button"
          disabled={pending || !stored?.ownerWif}
          onClick={secure}
          data-testid="lite-secure-confirm"
        >
          {t('lite_account.passkey.secure_confirm')}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * "Secure this account": makes a passkey held by a signer site the lite account's owner, so the
 * account survives this browser and can be signed in to elsewhere. Afterwards the browser holds
 * only its posting key.
 */
export default function LiteSecureDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation('common_blog');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-[460px] flex-col gap-4" data-testid="lite-secure-dialog">
        <DialogHeader>
          <DialogTitle>{t('lite_account.passkey.secure_title')}</DialogTitle>
          <DialogDescription>{t('lite_account.passkey.secure_description')}</DialogDescription>
        </DialogHeader>
        {open ? <LiteSecureForm onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
