'use client';

import { useState, type FormEvent } from 'react';
import type { LiteAuthorityView } from '@hiveio/lite-account';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@ui/components/button';
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
import { liteAuthorityErrorKey } from './lite-authority-errors';
import { liteAuthorityQuery } from './lite-authority-query';
import { deviceLabelGuess, passkeyRoot } from './lite-authority-state';
import LiteSignerPicker from './lite-signer-picker';
import { forgetLiteAccount } from './lite-storage';
import { useStoredLiteIdentityState } from './use-stored-lite-identity';
import { signerHostname, useLitePasskeyAccess } from './use-lite-passkey';
import { usePasskeyFlow } from './use-passkey-flow';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

type Found = { name: string; view: LiteAuthorityView; signer?: string };

/** Step one: the lite name, looked up through the gateway; only a passkey-secured account goes on. */
function NameStep({ onFound }: { onFound: (found: Found) => void }) {
  const { t } = useTranslation('common_blog');
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLooking(true);
    try {
      const view = await queryClient.fetchQuery({ ...liteAuthorityQuery(name), staleTime: 0 });
      const root = passkeyRoot(view);
      if (root) onFound({ name, view, signer: root.signer });
      else setError('lite_account.authority_errors.not_secured');
    } catch (failure) {
      setError(liteAuthorityErrorKey(failure));
    } finally {
      setLooking(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="lite-sign-in-name">{t('lite_account.name_dialog.label')}</Label>
        <Input
          id="lite-sign-in-name"
          value={name}
          autoComplete="username"
          autoFocus
          onChange={(e) => setName(e.target.value.trim().toLowerCase())}
          data-testid="lite-sign-in-name"
        />
        {error ? (
          <p className="text-xs text-destructive" role="alert" data-testid="lite-sign-in-error">
            {t(error)}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!name || looking} data-testid="lite-sign-in-continue">
          {t('lite_account.passkey.continue')}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Step two: the signer (the one the account's root names, else the only one configured, else the
 * guest picks), this device's label, and the passkey: a new posting key for this browser.
 */
function PasskeyStep({ found, onDone }: { found: Found; onDone: () => void }) {
  const { t } = useTranslation('common_blog');
  const [stored, store] = useStoredLiteIdentityState();
  const { relay } = useLitePasskeyAccess();
  const { run, pending } = usePasskeyFlow(found.name);
  const [picked, setPicked] = useState(configuredPasskeySigners[0]);
  const [label, setLabel] = useState(() => deviceLabelGuess(navigator.userAgent));
  const signer = found.signer ?? picked;

  const signIn = () => {
    if (!relay) return;
    void run(signer, async (popup) => {
      if (!popup) return;
      const { signInOnDevice } = await import('./lite-authority-flows');
      const identity = await signInOnDevice({
        name: found.name,
        current: found.view,
        popup,
        label: label.trim(),
        relay
      });
      if (stored && stored.name !== identity.name) forgetLiteAccount();
      store(identity);
      toast({ title: t('lite_account.passkey.signed_in_title', { name: identity.name }) });
      onDone();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {found.signer ? (
        <p className="text-sm" data-testid="lite-sign-in-signer">
          {t('lite_account.passkey.signer_is', { host: signerHostname(found.signer) })}
        </p>
      ) : (
        <LiteSignerPicker
          signers={configuredPasskeySigners}
          value={picked}
          onValueChange={setPicked}
          disabled={pending}
        />
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="lite-sign-in-label">{t('lite_account.passkey.device_label')}</Label>
        <Input
          id="lite-sign-in-label"
          value={label}
          maxLength={64}
          disabled={pending}
          onChange={(e) => setLabel(e.target.value)}
          data-testid="lite-sign-in-label"
        />
      </div>
      {pending ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t('lite_account.passkey.working')}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" disabled={pending} onClick={signIn} data-testid="lite-sign-in-confirm">
          {t('lite_account.passkey.sign_in_confirm')}
        </Button>
      </DialogFooter>
    </div>
  );
}

/** "Sign in on this device": uses a passkey-secured lite account in this browser, with a key of its own. */
export default function LiteSignInDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation('common_blog');
  const [found, setFound] = useState<Found | null>(null);
  const changeOpen = (next: boolean) => {
    if (!next) setFound(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="flex max-w-[460px] flex-col gap-4" data-testid="lite-sign-in-dialog">
        <DialogHeader>
          <DialogTitle>{t('lite_account.passkey.sign_in_title')}</DialogTitle>
          <DialogDescription>{t('lite_account.passkey.sign_in_description')}</DialogDescription>
        </DialogHeader>
        {found ? (
          <PasskeyStep found={found} onDone={() => changeOpen(false)} />
        ) : (
          <NameStep onFound={setFound} />
        )}
      </DialogContent>
    </Dialog>
  );
}
