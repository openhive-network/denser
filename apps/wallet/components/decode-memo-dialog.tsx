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
  DialogTrigger,
  Input,
  Label,
  Textarea
} from '@ui/components';
import { decryptMemoWithPrivateKey } from '@smart-signer/lib/memo-crypto';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { hasCompatiblePeakvault } from '@smart-signer/lib/signer/signer-peakvault';
import { getSigner } from '@smart-signer/lib/signer/get-signer';
import { KeyType, LoginType } from '@smart-signer/types/common';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

// See the identical constant in encrypt-memo-dialog.tsx.
const NATIVE_SIGNER_DECODE_LABEL_KEY: Partial<Record<LoginType, string>> = {
  [LoginType.keychain]: 'transfers_page.decode_memo_with_keychain',
  [LoginType.peakvault]: 'transfers_page.decode_memo_with_peakvault'
};

const isNativeSignerAvailable = (loginType: LoginType): boolean => {
  if (loginType === LoginType.keychain) return hasCompatibleKeychain();
  if (loginType === LoginType.peakvault) return hasCompatiblePeakvault();
  return false;
};

interface DecodeMemoDialogProps {
  username: string;
  encodedMemo: string;
}

const DecodeMemoDialog = ({ username, encodedMemo }: DecodeMemoDialogProps) => {
  const { t } = useTranslation('common_wallet');
  const { user } = useUserClient();
  const [open, setOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [decodedMessage, setDecodedMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nativeSignerAvailable, setNativeSignerAvailable] = useState(false);

  useEffect(() => {
    setNativeSignerAvailable(isNativeSignerAvailable(user.loginType));
  }, [user.loginType]);

  const resetState = () => {
    setPrivateKey('');
    setDecodedMessage('');
    setError('');
  };

  const onDecodeWithPrivateKey = async () => {
    setLoading(true);
    setError('');
    try {
      setDecodedMessage(await decryptMemoWithPrivateKey(privateKey, encodedMemo));
    } catch (error) {
      logger.error(error, 'Error decoding memo with private key');
      setError(t('transfers_page.decode_memo_error'));
    } finally {
      setLoading(false);
    }
  };

  const onDecodeWithNativeSigner = async () => {
    setLoading(true);
    setError('');
    try {
      const signer = getSigner({
        username,
        loginType: user.loginType,
        // Unused by decryptData (which hardcodes the 'memo' role internally)
        // - the Signer constructor just requires some truthy KeyType.
        keyType: KeyType.posting,
        storageType: 'localStorage'
      });
      setDecodedMessage(await signer.decryptData(encodedMemo));
    } catch (error) {
      logger.error(error, 'Error decoding memo with native signer');
      setError(t('transfers_page.decode_memo_error'));
    } finally {
      setLoading(false);
    }
  };

  const nativeSignerLabelKey = NATIVE_SIGNER_DECODE_LABEL_KEY[user.loginType];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto p-0 text-xs underline" data-testid="decode-memo-trigger">
          {t('transfers_page.decode_memo')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('transfers_page.decode_memo_title')}</DialogTitle>
          <DialogDescription>{t('transfers_page.decode_memo_description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="memo-private-key">{t('transfers_page.decode_memo_private_key')}</Label>
            <Input
              id="memo-private-key"
              type="password"
              autoComplete="off"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="original-memo">{t('transfers_page.decode_memo_original')}</Label>
            <Input id="original-memo" disabled value={encodedMemo} />
          </div>
          <div>
            <Label htmlFor="decoded-memo">{t('transfers_page.decode_memo_decoded')}</Label>
            <Textarea
              id="decoded-memo"
              rows={4}
              disabled
              value={decodedMessage}
              data-testid="decoded-memo-result"
            />
          </div>
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
          <Button onClick={onDecodeWithPrivateKey} disabled={!privateKey || loading}>
            {t('transfers_page.decode_memo_with_private_key')}
          </Button>
          {nativeSignerAvailable && nativeSignerLabelKey && (
            <Button variant="ghost" onClick={onDecodeWithNativeSigner} disabled={loading}>
              {t(nativeSignerLabelKey)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DecodeMemoDialog;
