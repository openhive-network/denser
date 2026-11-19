'use client';

import { useCallback } from 'react';
import { Button, Card, Separator } from '@ui/components';
import type { User } from '@smart-signer/types/common';
import { useStoredKeyTypes } from '@smart-signer/lib/auth/use-login-authority';
import { useAddSafeStorageKey } from '@smart-signer/lib/auth/use-add-safe-storage-key';
import { passkeyBindingOf } from '@smart-signer/lib/passkey/passkey-binding';
import { HIVE_BRIDGE_URL } from '@smart-signer/lib/google-drive-urls';
import type { KeyAuthorityType } from '@smart-signer/lib/utils';
import { handleError } from '@ui/lib/handle-error';
import { loginMethodOf } from '@/wallet/lib/account-keys';
import { isSafeStorageKeyType, removeSafeStorageKeys } from '@/wallet/lib/remove-safe-storage-keys';
import { useTranslation } from '@/wallet/i18n/client';

// The keys a safe storage session can add next to the one it signed in with (useAddSafeStorageKey)
const ADDABLE_KEY_TYPES = ['posting', 'active'] as const;

const SafeStorageKeys = ({ user }: { user: User }) => {
  const { t } = useTranslation('common_wallet');
  const { keyTypes = [] } = useStoredKeyTypes(user);
  const addKey = useAddSafeStorageKey(user);
  const removeKey = useCallback(
    (keyType: KeyAuthorityType) =>
      removeSafeStorageKeys(user.username, [keyType]).catch((error: unknown) =>
        handleError(error, { method: 'removeSafeStorageKey', params: { username: user.username, keyType } })
      ),
    [user.username]
  );
  const stored = [...new Set<string>([user.keyType, ...keyTypes])].filter(isSafeStorageKeyType);

  return (
    <div className="flex flex-col gap-2">
      <p>{t('permissions.how_you_sign.safe_storage')}</p>
      <ul className="flex flex-col gap-2" data-testid="safe-storage-key-types">
        {stored.map((keyType) => (
          <li key={keyType} className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{t(`permissions.${keyType}_key.name`)}</span>
            {keyType === user.keyType ? (
              <span className="text-xs">{t('permissions.how_you_sign.signed_in_with')}</span>
            ) : (
              <Button variant="outline" size="sm" onClick={() => removeKey(keyType)}>
                {t('permissions.how_you_sign.remove_from_browser')}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {ADDABLE_KEY_TYPES.filter((keyType) => !stored.includes(keyType)).map((keyType) => (
          <Button key={keyType} variant="outlineRed" size="sm" onClick={() => addKey(keyType)}>
            {t(`navigation.user_menu.add_${keyType}_key`)}
          </Button>
        ))}
      </div>
    </div>
  );
};

const SigningMethodNotice = ({ user }: { user: User }) => {
  const { t } = useTranslation('common_wallet');
  switch (loginMethodOf(user.loginType)) {
    case 'wif':
      return <p>{t('permissions.how_you_sign.wif')}</p>;
    case 'safe_storage':
      return <SafeStorageKeys user={user} />;
    case 'external_wallet':
      return (
        <p>
          {t('permissions.how_you_sign.external_wallet', {
            wallet: t(`navigation.user_menu.login_method.${user.loginType}`)
          })}
        </p>
      );
    case 'hiveauth':
      return <p>{t('permissions.how_you_sign.hiveauth')}</p>;
    case 'google':
      return (
        <p>
          {t('permissions.how_you_sign.google')}{' '}
          <a href={HIVE_BRIDGE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-destructive">
            {t('permissions.how_you_sign.manage_in_hive_bridge')}
          </a>
        </p>
      );
    case 'passkey':
      return (
        <p>
          {t('permissions.how_you_sign.passkey', {
            origin: passkeyBindingOf(user.username)?.origin ?? t('permissions.how_you_sign.passkey_signer')
          })}
        </p>
      );
  }
};

/** How the signed-in user's session signs, on their own account's permissions page. */
const HowYouSign = ({ user }: { user: User }) => {
  const { t } = useTranslation('common_wallet');
  return (
    <Card className="flex flex-col gap-4 p-4 text-sm drop-shadow-xl dark:bg-background/95 dark:text-white" data-testid="how-you-sign">
      <h2 className="text-2xl font-semibold">{t('permissions.how_you_sign.title')}</h2>
      <Separator />
      <SigningMethodNotice user={user} />
      <p>{t('permissions.how_you_sign.session_marked')}</p>
    </Card>
  );
};

export default HowYouSign;
