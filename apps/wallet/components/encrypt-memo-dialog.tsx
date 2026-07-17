'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label
} from '@ui/components';
import { encryptMemoWithPrivateKey } from '@smart-signer/lib/memo-crypto';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { hasCompatiblePeakvault } from '@smart-signer/lib/signer/signer-peakvault';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { getAccount } from '@transaction/lib/hive-api';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

// Login types whose Signer can encrypt a MEMO natively (Signer.encryptData -
// see packages/smart-signer/lib/signer/signer.ts), with the translation key
// for that button's label. Not every login type is here: hb-auth's key store
// only knows active/posting/owner, and HiveAuth's remote relay flow has no
// local key material - both fall through to the WIF option below.
const NATIVE_SIGNER_ENCRYPT_LABEL_KEY: Partial<Record<LoginType, string>> = {
  [LoginType.keychain]: 'transfers_page.encrypt_memo_with_keychain',
  [LoginType.peakvault]: 'transfers_page.encrypt_memo_with_peakvault'
};

const isNativeSignerAvailable = (loginType: LoginType): boolean => {
  if (loginType === LoginType.keychain) return hasCompatibleKeychain();
  if (loginType === LoginType.peakvault) return hasCompatiblePeakvault();
  return false;
};

interface EncryptMemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromAccount: string;
  toAccount: string;
  memo: string;
  onEncrypted: (encryptedMemo: string) => void;
}

const EncryptMemoDialog = ({
  open,
  onOpenChange,
  fromAccount,
  toAccount,
  memo,
  onEncrypted
}: EncryptMemoDialogProps) => {
  const { t } = useTranslation('common_wallet');
  const { user } = useUserClient();
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nativeSignerAvailable, setNativeSignerAvailable] = useState(false);

  useEffect(() => {
    setNativeSignerAvailable(isNativeSignerAvailable(user.loginType));
  }, [user.loginType]);

  useEffect(() => {
    if (!open) {
      setPrivateKey('');
      setError('');
    }
  }, [open]);

  const onEncryptWithPrivateKey = async () => {
    setLoading(true);
    setError('');
    try {
      const account = await getAccount(toAccount);
      if (!account) throw new Error(`Unknown account ${toAccount}`);
      const encrypted = await encryptMemoWithPrivateKey(privateKey, account.memo_key, memo);
      onEncrypted(encrypted);
    } catch (error) {
      logger.error(error, 'Error encrypting memo with private key');
      setError(t('transfers_page.encrypt_memo_error'));
    } finally {
      setLoading(false);
    }
  };

  const onEncryptWithNativeSigner = async () => {
    setLoading(true);
    setError('');
    try {
      const account = await getAccount(toAccount);
      if (!account) throw new Error(`Unknown account ${toAccount}`);
      const signer = getSigner({
        username: fromAccount,
        loginType: user.loginType,
        // Unused by encryptData (which hardcodes the 'memo' role internally)
        // - the Signer constructor just requires some truthy KeyType.
        keyType: KeyType.posting,
        storageType: 'localStorage'
      });
      const encrypted = await signer.encryptData({ toAccount, toAccountMemoPublicKey: account.memo_key, memo });
      onEncrypted(encrypted);
    } catch (error) {
      logger.error(error, 'Error encrypting memo with native signer');
      setError(t('transfers_page.encrypt_memo_error'));
    } finally {
      setLoading(false);
    }
  };

  const nativeSignerLabelKey = NATIVE_SIGNER_ENCRYPT_LABEL_KEY[user.loginType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('transfers_page.encrypt_memo_title')}</DialogTitle>
          <DialogDescription>{t('transfers_page.encrypt_memo_description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="encrypt-memo-plaintext">{t('transfers_page.encrypt_memo_plaintext')}</Label>
            <Input id="encrypt-memo-plaintext" disabled value={memo} />
          </div>
          <div>
            <Label htmlFor="encrypt-memo-private-key">{t('transfers_page.decode_memo_private_key')}</Label>
            <Input
              id="encrypt-memo-private-key"
              type="password"
              autoComplete="off"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
          <Button onClick={onEncryptWithPrivateKey} disabled={!privateKey || loading}>
            {t('transfers_page.encrypt_memo_with_private_key')}
          </Button>
          {nativeSignerAvailable && nativeSignerLabelKey && (
            <Button variant="ghost" onClick={onEncryptWithNativeSigner} disabled={loading}>
              {t(nativeSignerLabelKey)}
            </Button>
          )}
          <Button variant="link" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('transfers_page.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EncryptMemoDialog;
