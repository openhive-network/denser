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
import { decryptMemoWithKeychain, decryptMemoWithPrivateKey } from '@smart-signer/lib/decrypt-memo';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { useTranslation } from '@/wallet/i18n/client';

interface DecodeMemoDialogProps {
  username: string;
  encodedMemo: string;
}

const DecodeMemoDialog = ({ username, encodedMemo }: DecodeMemoDialogProps) => {
  const { t } = useTranslation('common_wallet');
  const [open, setOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [decodedMessage, setDecodedMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [keychainSupported, setKeychainSupported] = useState(false);

  useEffect(() => {
    setKeychainSupported(hasCompatibleKeychain());
  }, []);

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
    } catch {
      setError(t('transfers_page.decode_memo_error'));
    } finally {
      setLoading(false);
    }
  };

  const onDecodeWithKeychain = async () => {
    setLoading(true);
    setError('');
    try {
      setDecodedMessage(await decryptMemoWithKeychain(username, encodedMemo));
    } catch {
      setError(t('transfers_page.decode_memo_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="h-auto p-0 text-xs underline"
          data-testid="decode-memo-trigger"
        >
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
          {keychainSupported && (
            <Button variant="ghost" onClick={onDecodeWithKeychain} disabled={loading}>
              {t('transfers_page.decode_memo_with_keychain')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DecodeMemoDialog;
