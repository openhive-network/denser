'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PasskeyPrompt from '@smart-signer/components/auth/passkey-prompt';
import { handleAuthError } from '@smart-signer/lib/auth-error';
import { shouldOfferPasskey } from '@smart-signer/lib/auth/passkey-prompt-offer';
import { passwordSchema } from '@smart-signer/lib/validators/validate-password';
import { Button } from '@ui/components/button';
import { DialogFooter } from '@ui/components/dialog';
import { toast } from '@ui/components/hooks/use-toast';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { useTranslation } from '@/blog/i18n/client';
import { liteWalletClient } from './lite-wallet-browser';
import { liteWalletUsername, moveKeysToSafeStorage } from './lite-wallet';
import { useStoredLiteIdentityState } from './use-stored-lite-identity';

type Fields = { password: string; repeat: string };
/** The entry the passkey offer is for (the password just set is in a ref, not in state). */
type PasskeyOffer = { username: string };

const fieldsSchema = (mismatch: string) =>
  z.object({ password: passwordSchema, repeat: z.string() }).refine((fields) => fields.password === fields.repeat, {
    message: mismatch,
    path: ['repeat']
  });

/**
 * "Secure in Safe Storage": a new password, then every key the stored identity holds is registered
 * in hb-auth's wallet under the lite entry and the record keeps none. Afterwards the passkey unlock
 * is offered as after a Hive Safe Storage sign-in (smart-signer's `PasskeyPrompt`), where the
 * browser supports it and the guest did not dismiss it.
 */
export default function LiteSafeStorageForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('common_blog');
  const [stored, store] = useStoredLiteIdentityState();
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<PasskeyOffer | null>(null);
  const offerPassword = useRef('');
  const form = useForm<Fields>({
    resolver: zodResolver(fieldsSchema(t('lite_account.safe_storage.password_mismatch'))),
    defaultValues: { password: '', repeat: '' }
  });
  const { isSubmitting, errors } = form.formState;

  const secure = async ({ password }: Fields) => {
    if (!stored) return;
    setError(null);
    try {
      const client = await liteWalletClient();
      store(await moveKeysToSafeStorage(stored, password, client));
      toast({ title: t('lite_account.safe_storage.secured_title'), description: t('lite_account.safe_storage.secured_description') });
      const username = liteWalletUsername(stored);
      if (!(await shouldOfferPasskey(client, username))) {
        onDone();
        return;
      }
      offerPassword.current = password;
      setOffer({ username });
    } catch (failure) {
      setError(handleAuthError(failure, 'LiteSafeStorageForm.secure'));
    }
  };

  const registerPasskey = async () => {
    if (!offer) return;
    await (await liteWalletClient()).registerPasskey(offer.username, offerPassword.current);
  };

  if (offer) {
    return (
      <PasskeyPrompt
        username={offer.username}
        onEnable={registerPasskey}
        onError={(message) => toast({ title: t('lite_account.safe_storage.passkey_failed_title'), description: message, variant: 'destructive' })}
        onDone={() => {
          offerPassword.current = '';
          onDone();
        }}
      />
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(secure)} data-testid="lite-safe-storage-form">
      <div className="flex flex-col gap-1">
        <Label htmlFor="lite-safe-storage-password">{t('lite_account.safe_storage.password_label')}</Label>
        <Input
          id="lite-safe-storage-password"
          type="password"
          autoComplete="new-password"
          disabled={isSubmitting}
          {...form.register('password')}
          data-testid="lite-safe-storage-password"
        />
        {errors.password?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="lite-safe-storage-repeat">{t('lite_account.safe_storage.password_repeat_label')}</Label>
        <Input
          id="lite-safe-storage-repeat"
          type="password"
          autoComplete="new-password"
          disabled={isSubmitting}
          {...form.register('repeat')}
          data-testid="lite-safe-storage-repeat"
        />
        {errors.repeat?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.repeat.message}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert" data-testid="lite-safe-storage-error">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onDone}>
          {t('lite_account.manage.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting || !stored} data-testid="lite-safe-storage-confirm">
          {isSubmitting ? t('lite_account.safe_storage.working') : t('lite_account.safe_storage.confirm')}
        </Button>
      </DialogFooter>
    </form>
  );
}
