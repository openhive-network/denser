'use client';

import { useState } from 'react';
import { Separator } from '@ui/components';
import { Link } from '@hive/ui';
import { getImageSrc } from '@ui/lib/path-utils';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import env from '@beam-australia/react-env';
import { getPrivateKeys } from '@transaction/lib/hive';
import { toast } from '@ui/components/hooks/use-toast';
import RevealKeyComponent from '@/wallet/components/reveal-key-component';
import WalletMenu from '@/wallet/components/wallet-menu';
import AccountPermissionsSummary from '@/wallet/components/account-permissions-summary';
import HowYouSign from '@/wallet/components/how-you-sign';
import KeyRoleCard, { type KeyRoleName } from '@/wallet/components/key-role-card';
import { useAuthorityOperations } from '@/wallet/components/hooks/use-authority-operation';
import { useKeyMarks } from '@/wallet/components/hooks/use-key-marks';
import { isOwnAccount } from '@/wallet/lib/account-keys';

const ROLES: readonly KeyRoleName[] = ['posting', 'active', 'owner', 'memo'];

interface Key {
  type: string;
  privateKey: string;
  correctKey: boolean;
}
function keyDecoded(keys: Key[], type: KeyRoleName) {
  const key = keys.find((key) => key.type === type);
  return key?.correctKey ? key?.privateKey : undefined;
}

const MOCK_VALUE = '1'.repeat(50);

export default function PermissionsPage({ username }: { username: string }) {
  const { t } = useTranslation('common_wallet');
  const { user } = useUserClient();
  const explorerURL = env('EXPLORER_DOMAIN');
  const own = isOwnAccount(user, username);
  // A master password derives the keys of the signed-in account, so only its own page reveals them
  const canReveal = own && user.loginType === 'wif';
  const {
    state: {
      data: { memo, authorityLevels }
    },
    isLoading
  } = useAuthorityOperations(username);
  const marks = useKeyMarks(user, username, authorityLevels);
  const [reveal, setReveal] = useState<Record<KeyRoleName, boolean>>({
    posting: false,
    active: false,
    owner: false,
    memo: false
  });
  const [keys, setKeys] = useState<Record<KeyRoleName, string>>({
    posting: MOCK_VALUE,
    active: MOCK_VALUE,
    owner: MOCK_VALUE,
    memo: MOCK_VALUE
  });
  const onReveal = async (password: string, keyType: KeyRoleName) => {
    if (keys[keyType] !== MOCK_VALUE) {
      setReveal((prev) => ({ ...prev, [keyType]: true }));
      return;
    }
    try {
      const keysCheck = await getPrivateKeys(username, password);
      if (keysCheck.some((key) => key.correctKey !== true)) {
        toast({
          title: t('permissions.errors.title'),
          description: t('permissions.errors.not_all_keys'),
          variant: 'destructive'
        });
      } else {
        setKeys((prev) => ({
          posting: keyDecoded(keysCheck, 'posting') || prev.posting,
          active: keyDecoded(keysCheck, 'active') || prev.active,
          owner: keyDecoded(keysCheck, 'owner') || prev.owner,
          memo: keyDecoded(keysCheck, 'memo') || prev.memo
        }));
        setReveal((prev) => ({ ...prev, [keyType]: true }));
      }
    } catch {
      toast({
        title: t('permissions.errors.title'),
        description: t('permissions.errors.reveal_failed'),
        variant: 'destructive'
      });
    }
  };
  return (
    <div className="flex flex-col gap-8 ">
      <div className="flex gap-6">
        <WalletMenu username={username} />
      </div>
      <div className="flex flex-col gap-8 px-6">
        <h1 className="text-2xl font-semibold">{t('permissions.keys_and_permissions')}</h1>
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex flex-col gap-6 text-sm">
            {own ? (
              <>
                <p>{t('permissions.any_password')}</p>
                <p>{t('permissions.note')}</p>
              </>
            ) : (
              <p>{t('permissions.about_this_account', { username })}</p>
            )}
          </div>
          <img
            className="w-[300px]"
            src={getImageSrc('/permissions.png')}
            alt={t('permissions.graphic_alt')}
          />
        </div>

        <AccountPermissionsSummary
          username={username}
          authorityLevels={authorityLevels}
          memoKey={memo?.value}
          isLoading={isLoading}
          marks={marks}
          canEdit={own}
        />

        {own ? <HowYouSign user={user} /> : null}

        {canReveal ? <p className="text-sm">{t('permissions.reveal_intro')}</p> : null}
        {ROLES.map((role) => (
          <KeyRoleCard key={role} role={role} own={own}>
            {canReveal ? (
              <RevealKeyComponent
                reveal={reveal[role]}
                keyValue={keys[role]}
                onReveal={(password) => onReveal(password, role)}
                title={t(`permissions.${role}_key.private`)}
                mockValue={MOCK_VALUE}
                type={role}
              />
            ) : null}
          </KeyRoleCard>
        ))}

        <Separator />
        <div className="flex flex-col gap-4 py-12 text-sm">
          <h2 className="text-xl font-semibold">{t('permissions.public_keys')}</h2>
          <p>{t(own ? 'permissions.public_info' : 'permissions.public_info_this_account')}</p>
          <div>
            <p>{t('permissions.view_public')}</p>
            <Link href={`${explorerURL}/@${username}`} className="font-bold text-red-600" target="_blank">
              {t('permissions.block_explorer', { username })}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
