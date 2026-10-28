/* The "Passkey signer" sign-in: the account's posting key is derived in a passkey signer site */
import { FC, useEffect, useState } from 'react';
import { Button, Input, Label, RadioGroup, RadioGroupItem } from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';
import { configuredPasskeySigners } from '@ui/config/public-vars';
import { handleError } from '@ui/lib/handle-error';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { getChain } from '@transaction/lib/chain';
import { validateHiveAccountName } from '@smart-signer/lib/validators/validate-hive-account-name';
import { findPasskeyPostingKey, passkeyLoginErrorKey } from '@smart-signer/lib/passkey/find-posting-key';
import { passkeyBindingOf, rememberPasskeyBinding } from '@smart-signer/lib/passkey/passkey-binding';
import { openSignerPopup, type SignerPopup } from '@smart-signer/lib/passkey/signer-client';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { Steps } from '../form';
import Step from '../step';

export interface PasskeyProps {
  onSetStep: (step: Steps) => void;
  i18nNamespace: string;
  username: string;
  onUsernameChange: (username: string) => void;
  signIn: (loginType: LoginType, username: string, keyType: KeyType) => Promise<void>;
}

const signerHost = (origin: string) => new URL(origin).host;

/**
 * Two clicks, each opening the signer's popup (it takes one request): "Find my key" asks the signer
 * for its posting key and matches it against the account's posting authority; "Sign in" has the
 * signer sign the login challenge with it. An account whose key was found before (or that graduated
 * here) starts at the second.
 */
const Passkey: FC<PasskeyProps> = ({ onSetStep, i18nNamespace, username, onUsernameChange, signIn }) => {
  const { t } = useSharedTranslation(i18nNamespace);
  const [origin, setOrigin] = useState(configuredPasskeySigners[0]);
  const [found, setFound] = useState(() => !!username && !!passkeyBindingOf(username));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const usernameError = username ? validateHiveAccountName(username, (v) => v) : null;

  // The sign-in click opens the signer once the chain is loaded: load it now, so the click still counts.
  useEffect(() => {
    getChain().catch((failure: unknown) => handleError(failure));
  }, []);

  const fail = (failure: unknown) => {
    const key = passkeyLoginErrorKey(failure);
    if (key === undefined) handleError(failure);
    else setError(key);
  };

  const changeUsername = (value: string) => {
    const next = value.trim().toLowerCase();
    onUsernameChange(next);
    setFound(!!next && !!passkeyBindingOf(next));
    setError(null);
  };

  const findKey = async () => {
    setError(null);
    let popup: SignerPopup | null = null;
    try {
      popup = openSignerPopup(origin);
      setLoading(true);
      rememberPasskeyBinding(username, await findPasskeyPostingKey(popup, username));
      setFound(true);
    } catch (failure) {
      fail(failure);
    } finally {
      popup?.close();
      setLoading(false);
    }
  };

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(LoginType.passkey, username, KeyType.posting);
    } catch (failure) {
      fail(failure);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Step
      loading={loading}
      title={t('login_form.passkey.title')}
      description={<span data-testid="passkey-signin-description">{t('login_form.passkey.description')}</span>}
    >
      <div className="flex flex-col gap-4" data-testid="passkey-signin">
        <div className="flex flex-col gap-2">
          <Input
            placeholder={t('login_form.username_placeholder')}
            aria-label={t('login_form.username_placeholder')}
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => changeUsername(event.target.value)}
            data-testid="passkey-signin-username"
          />
          {usernameError ? <p className="text-xs text-destructive">{usernameError}</p> : null}
        </div>
        {!found && configuredPasskeySigners.length > 1 ? (
          <RadioGroup value={origin} onValueChange={setOrigin} data-testid="passkey-signin-signers">
            <Label>{t('login_form.passkey.signer_label')}</Label>
            {configuredPasskeySigners.map((signer) => (
              <div key={signer} className="flex items-center gap-2">
                <RadioGroupItem value={signer} id={`passkey-signer-${signer}`} />
                <Label htmlFor={`passkey-signer-${signer}`}>{signerHost(signer)}</Label>
              </div>
            ))}
          </RadioGroup>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert" data-testid="passkey-signin-error">
            {t(error)}
          </p>
        ) : null}
        {found ? (
          <>
            <p className="text-sm" data-testid="passkey-signin-found">
              {t('login_form.passkey.found', { username })}
            </p>
            <Button type="button" disabled={loading} onClick={() => void submit()} data-testid="passkey-signin-submit">
              <Icons.keyRound className="mr-2 h-4 w-4" />
              {t('login_form.passkey.sign_in', { username })}
            </Button>
            <Button type="button" variant="ghost" disabled={loading} onClick={() => setFound(false)} data-testid="passkey-signin-again">
              {t('login_form.passkey.find_again')}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            disabled={loading || !username || !!usernameError}
            onClick={() => void findKey()}
            data-testid="passkey-signin-find"
          >
            <Icons.keyRound className="mr-2 h-4 w-4" />
            {t('login_form.passkey.find')}
          </Button>
        )}
        <Button
          className="mt-4 w-full"
          type="button"
          variant="secondary"
          onClick={() => onSetStep(Steps.OTHER_LOGIN_OPTIONS)}
          data-testid="passkey-signin-back"
        >
          <Icons.chevronLeft className="mr-2 h-4 w-4" /> {t('login_form.go_back_button')}
        </Button>
      </div>
    </Step>
  );
};

export default Passkey;
