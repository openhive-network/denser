'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
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
import { Label } from '@ui/components/label';
import { configuredPasskeySigners } from '@ui/config/public-vars';
import { useTranslation } from '@/blog/i18n/client';
import type { PasskeyRootKey } from './lite-authority-flows';
import { deviceLabelGuess } from './lite-authority-state';
import { canSecureInSafeStorage, canSecureWithPasskey, heldKeyRoles } from './lite-identity-record';
import LiteKeyLabelField from './lite-key-label-field';
import { authenticatorLabel } from './lite-passkey-label';
import LiteSignerPicker from './lite-signer-picker';
import { useStoredLiteIdentity, useStoredLiteIdentityState } from './use-stored-lite-identity';
import { useLitePasskeyAccess } from './use-lite-passkey';
import { usePasskeyFlow } from './use-passkey-flow';

// hb-auth's wallet loads with the Safe Storage form only
const LiteSafeStorageForm = dynamic(() => import('./lite-safe-storage-form'), { ssr: false });

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

/** How the dialog secures the account: the passkey signer, or Safe Storage. */
type SecureMode = 'passkey' | 'safe-storage';

/**
 * The dialog's body, mounted on each opening: the signer, whether to record it on chain and this
 * browser's key's label; once the signer has answered with the passkey's key, the passkey's label
 * (pre-filled from what the signer reports) and the edits that secure the account.
 */
function LiteSecureForm({ onDone, onUseSafeStorage }: { onDone: () => void; onUseSafeStorage?: () => void }) {
  const { t } = useTranslation('common_blog');
  const [stored, store] = useStoredLiteIdentityState();
  const { relay } = useLitePasskeyAccess();
  const { run, pending } = usePasskeyFlow(stored?.name);
  const [signer, setSigner] = useState(configuredPasskeySigners[0]);
  const [recordSigner, setRecordSigner] = useState(true);
  const [label, setLabel] = useState(() => deviceLabelGuess(navigator.userAgent));
  const [root, setRoot] = useState<PasskeyRootKey | null>(null);
  const [passkeyLabel, setPasskeyLabel] = useState('');
  const holdsOwner = !!stored && heldKeyRoles(stored).includes('owner');

  const connect = () => {
    void run(signer, async (popup) => {
      if (!popup) return;
      const { readPasskeyRootKey } = await import('./lite-authority-flows');
      const read = await readPasskeyRootKey(popup);
      setPasskeyLabel(
        authenticatorLabel(read.authenticator) ?? t('lite_account.passkey.passkey_default_label')
      );
      setRoot(read);
    });
  };

  const secure = () => {
    if (!stored || !relay || !root) return;
    void run(null, async () => {
      const { secureLiteAccount } = await import('./lite-authority-flows');
      const secured = await secureLiteAccount({
        identity: stored,
        root,
        recordSigner,
        label: label.trim(),
        passkeyLabel: passkeyLabel.trim(),
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
        disabled={pending || !!root}
      />
      {root ? (
        <LiteKeyLabelField
          id="lite-secure-passkey-label"
          label={t('lite_account.passkey.passkey_label')}
          hint={t('lite_account.passkey.passkey_label_hint')}
          value={passkeyLabel}
          disabled={pending}
          onChange={setPasskeyLabel}
        />
      ) : null}
      <LiteKeyLabelField
        id="lite-secure-label"
        label={t('lite_account.passkey.device_label')}
        hint={t('lite_account.passkey.device_label_hint')}
        value={label}
        disabled={pending}
        onChange={setLabel}
      />
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
      {onUseSafeStorage && !root ? (
        <Button
          type="button"
          variant="link"
          className="h-auto self-start whitespace-normal p-0 text-left"
          disabled={pending}
          onClick={onUseSafeStorage}
          data-testid="lite-secure-use-safe-storage"
        >
          {t('lite_account.safe_storage.use_instead')}
        </Button>
      ) : null}
      {pending ? (
        <p className="text-sm text-muted-foreground" role="status" data-testid="lite-secure-pending">
          {t('lite_account.passkey.working')}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" disabled={pending} onClick={onDone}>
          {t('lite_account.manage.cancel')}
        </Button>
        {root ? (
          <Button
            type="button"
            disabled={pending || !holdsOwner || !relay}
            onClick={secure}
            data-testid="lite-secure-confirm"
          >
            {t('lite_account.passkey.secure_confirm')}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={pending || !holdsOwner || !relay}
            onClick={connect}
            data-testid="lite-secure-connect"
          >
            {t('lite_account.passkey.secure_connect')}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

/**
 * "Secure this account": makes a passkey held by a signer site the lite account's owner, so the
 * account survives this browser and can be signed in to elsewhere; afterwards the browser holds only
 * its posting key. Or, where the keys are still in the stored record, moves them into Safe Storage
 * behind a password (the only way offered where no passkey signer can secure it).
 */
export default function LiteSecureDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation('common_blog');
  const identity = useStoredLiteIdentity();
  const passkey = useLitePasskeyAccess().available && !!identity && canSecureWithPasskey(identity);
  // Chosen on opening: securing changes the stored identity, which is not to switch the form
  const [mode, setMode] = useState<SecureMode>(passkey ? 'passkey' : 'safe-storage');
  const [safeStorage] = useState(() => !!identity && canSecureInSafeStorage(identity));
  const done = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-[460px] flex-col gap-4" data-testid="lite-secure-dialog" data-mode={mode}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'passkey' ? t('lite_account.passkey.secure_title') : t('lite_account.safe_storage.title')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'passkey' ? t('lite_account.passkey.secure_description') : t('lite_account.safe_storage.description')}
          </DialogDescription>
        </DialogHeader>
        {open && mode === 'passkey' ? (
          <LiteSecureForm onDone={done} onUseSafeStorage={safeStorage ? () => setMode('safe-storage') : undefined} />
        ) : null}
        {open && mode === 'safe-storage' ? <LiteSafeStorageForm onDone={done} /> : null}
      </DialogContent>
    </Dialog>
  );
}
