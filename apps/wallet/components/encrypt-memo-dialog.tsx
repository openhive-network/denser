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
import { loadNativeMemoSigner } from '@smart-signer/lib/load-native-memo-signer';
import type { SignerTool } from '@smart-signer/lib/signer/get-signer';
import { LoginType } from '@smart-signer/types/common';
import { getAccount } from '@transaction/lib/hive-api';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

// The native-signer button's label for the login types that encrypt a MEMO
// themselves (see load-native-memo-signer.ts); the others use the WIF option.
const NATIVE_SIGNER_ENCRYPT_LABEL_KEY: Partial<Record<LoginType, string>> = {
  [LoginType.keychain]: 'transfers_page.encrypt_memo_with_keychain',
  [LoginType.peakvault]: 'transfers_page.encrypt_memo_with_peakvault'
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
  // Loaded when the dialog opens: the signer modules pull in wax (DR-005).
  const [nativeSigner, setNativeSigner] = useState<SignerTool | null>(null);

  useEffect(() => {
    if (!open) return;
    let current = true;
    loadNativeMemoSigner(fromAccount, user.loginType)
      .then((signer) => {
        if (current) setNativeSigner(signer);
      })
      .catch((error) => logger.error(error, 'Error loading the native memo signer'));
    return () => {
      current = false;
    };
  }, [open, fromAccount, user.loginType]);

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
    if (!nativeSigner) return;
    setLoading(true);
    setError('');
    try {
      const account = await getAccount(toAccount);
      if (!account) throw new Error(`Unknown account ${toAccount}`);
      const encrypted = await nativeSigner.encryptData({
        toAccount,
        toAccountMemoPublicKey: account.memo_key,
        memo
      });
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
          {nativeSigner && nativeSignerLabelKey && (
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
