'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
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
import { hasNativeMemoCrypto, loadNativeMemoSigner } from '@smart-signer/lib/load-native-memo-signer';
import { OutdatedMetaMaskSnapError } from '@smart-signer/lib/metamask-snap-version';
import { isWalletRequestRejected } from '@smart-signer/lib/signer/wallet-request-rejected';
import type { SignerTool } from '@smart-signer/lib/signer/get-signer';
import { LoginType } from '@smart-signer/types/common';
import { useTranslation } from '@/wallet/i18n/client';
import { useUnansweredRequest } from '@/wallet/components/hooks/use-unanswered-request';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { NATIVE_MEMO_SIGNER_NAME } from '@/wallet/lib/native-memo-signer-name';
import { getLogger } from '@ui/lib/logging';
import { isUserCancelled } from '@ui/lib/user-cancelled';

const logger = getLogger('app');

// See the identical constant in encrypt-memo-dialog.tsx.
const NATIVE_SIGNER_DECODE_LABEL_KEY: Partial<Record<LoginType, string>> = {
  [LoginType.keychain]: 'transfers_page.decode_memo_with_keychain',
  [LoginType.peakvault]: 'transfers_page.decode_memo_with_peakvault',
  [LoginType.metamask]: 'transfers_page.decode_memo_with_metamask'
};

type DecodeKind = 'native' | 'key';

interface PendingDecode {
  kind: DecodeKind;
  requestId: number;
}

const nativeSignerErrorMessage = (
  error: unknown,
  wallet: string | undefined,
  t: TFunction<'common_wallet', undefined>
): string => {
  if (error instanceof OutdatedMetaMaskSnapError) {
    return t('transfers_page.metamask_snap_outdated', {
      installed: error.installedVersion,
      required: error.requiredVersion
    });
  }
  if (isWalletRequestRejected(error) || isUserCancelled(error)) {
    return t('transfers_page.decode_memo_wallet_rejected', { wallet });
  }
  return t('transfers_page.decode_memo_wallet_error', { wallet });
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
  const [pending, setPending] = useState<PendingDecode | null>(null);
  // Loaded when the dialog opens: the signer modules pull in wax (DR-005).
  const [nativeSigner, setNativeSigner] = useState<SignerTool | null>(null);
  // Set once the native signer is loaded (or known to be unavailable), before its request is
  // answered: an extension may never answer a rejected request, so the private-key form and the
  // retry must not wait for it.
  const [signerLoaded, setSignerLoaded] = useState(false);
  const autoAttemptStarted = useRef(false);
  // Bumped by every decode and every close, so only the latest request's answer is shown: an
  // extension answers a request it dropped for a newer one, and a closed dialog's request may
  // be answered after it was reopened.
  const requestIdRef = useRef(0);
  const walletName = NATIVE_MEMO_SIGNER_NAME[user.loginType];
  // Named in the description only while its decode button is offered.
  const offeredWalletName = nativeSigner ? walletName : undefined;
  const nativeUnanswered = useUnansweredRequest(pending?.kind === 'native' ? pending.requestId : null);

  const resetState = () => {
    setPrivateKey('');
    setDecodedMessage('');
    setError('');
    setPending(null);
    setSignerLoaded(false);
    autoAttemptStarted.current = false;
    requestIdRef.current += 1;
  };

  const runDecode = useCallback(
    async (
      kind: DecodeKind,
      decode: () => Promise<string>,
      errorMessage: (e: unknown) => string
    ) => {
      const requestId = ++requestIdRef.current;
      const isLatest = () => requestIdRef.current === requestId;
      setPending({ kind, requestId });
      setDecodedMessage('');
      setError('');
      try {
        const decoded = await decode();
        if (isLatest()) setDecodedMessage(decoded);
      } catch (error) {
        logger.error(error, 'Error decoding memo with %s', kind === 'key' ? 'private key' : 'native signer');
        if (isLatest()) setError(errorMessage(error));
      } finally {
        if (isLatest()) setPending(null);
      }
    },
    []
  );

  const onDecodeWithPrivateKey = () =>
    runDecode(
      'key',
      () => decryptMemoWithPrivateKey(privateKey, encodedMemo),
      () => t('transfers_page.decode_memo_error')
    );

  const decodeWithNativeSigner = useCallback(
    (signer: SignerTool) =>
      runDecode(
        'native',
        () => signer.decryptData(encodedMemo),
        (error) => nativeSignerErrorMessage(error, walletName, t)
      ),
    [runDecode, encodedMemo, walletName, t]
  );

  const onDecodeWithNativeSigner = () => {
    if (nativeSigner) decodeWithNativeSigner(nativeSigner);
  };

  // Try the logged-in signer's own key store first; reveal the manual private-key
  // form once the signer is loaded, without waiting for the extension's answer.
  useEffect(() => {
    if (!open || autoAttemptStarted.current) return;
    autoAttemptStarted.current = true;

    const requestId = requestIdRef.current;
    loadNativeMemoSigner(username, user.loginType)
      .then((signer) => {
        if (requestIdRef.current !== requestId) return;
        setNativeSigner(signer);
        setSignerLoaded(true);
        if (signer) decodeWithNativeSigner(signer);
      })
      .catch((error) => {
        logger.error(error, 'Error loading the native memo signer');
        if (requestIdRef.current === requestId) setSignerLoaded(true);
      });
  }, [open, username, user.loginType, decodeWithNativeSigner]);

  const nativeSignerLabelKey = NATIVE_SIGNER_DECODE_LABEL_KEY[user.loginType];
  const showAutoTrying =
    hasNativeMemoCrypto(user.loginType) && (!signerLoaded || pending?.kind === 'native') && !nativeUnanswered;

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
          <DialogDescription>
            {offeredWalletName
              ? t('transfers_page.decode_memo_description_with_wallet', { wallet: offeredWalletName })
              : t('transfers_page.decode_memo_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {showAutoTrying && (
            <div className="text-sm text-muted-foreground" data-testid="decode-memo-auto-trying">
              {t('transfers_page.decode_memo_auto_trying')}
            </div>
          )}
          {nativeUnanswered && (
            <div className="text-sm text-destructive" data-testid="decode-memo-no-answer">
              {t('transfers_page.decode_memo_wallet_no_answer', { wallet: walletName })}
            </div>
          )}
          {signerLoaded && (
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
          )}
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
          {error && (
            <div className="text-sm text-destructive" data-testid="decode-memo-error">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
          {signerLoaded && (
            <Button onClick={onDecodeWithPrivateKey} disabled={!privateKey || pending?.kind === 'key'}>
              {t('transfers_page.decode_memo_with_private_key')}
            </Button>
          )}
          {nativeSigner && nativeSignerLabelKey && (
            <Button variant="ghost" onClick={onDecodeWithNativeSigner} disabled={pending?.kind === 'key'}>
              {t(nativeSignerLabelKey)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DecodeMemoDialog;
