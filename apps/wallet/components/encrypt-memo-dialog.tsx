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
import { encryptMemoWithKeychain, encryptMemoWithPrivateKey } from '@smart-signer/lib/memo-crypto';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { getAccount } from '@transaction/lib/hive-api';
import { useTranslation } from '@/wallet/i18n/client';

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
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [keychainSupported, setKeychainSupported] = useState(false);

  useEffect(() => {
    setKeychainSupported(hasCompatibleKeychain());
  }, []);

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
    } catch {
      setError(t('transfers_page.encrypt_memo_error'));
    } finally {
      setLoading(false);
    }
  };

  const onEncryptWithKeychain = async () => {
    setLoading(true);
    setError('');
    try {
      const encrypted = await encryptMemoWithKeychain(fromAccount, toAccount, memo);
      onEncrypted(encrypted);
    } catch {
      setError(t('transfers_page.encrypt_memo_error'));
    } finally {
      setLoading(false);
    }
  };

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
          {keychainSupported && (
            <Button variant="ghost" onClick={onEncryptWithKeychain} disabled={loading}>
              {t('transfers_page.encrypt_memo_with_keychain')}
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
