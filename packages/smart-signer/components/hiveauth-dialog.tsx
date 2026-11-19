'use client';

import { FC, useEffect, useRef, useSyncExternalStore } from 'react';
import QRCode from 'qrcode';
import { create, InstanceProps } from 'react-modal-promise';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/components/dialog';
import { Button, buttonVariants } from '@ui/components/button';
import { cn } from '@ui/lib/utils';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { getLogger } from '@ui/lib/logging';
import { HIVEAUTH_FAILURE_KEYS } from '@smart-signer/lib/hiveauth/hiveauth-error';
import type { HiveAuthPrompt } from '@smart-signer/lib/hiveauth/prompt';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

const logger = getLogger('app');

const TITLE_KEYS = {
  sign_in: 'hiveauthservices.title_sign_in',
  sign: 'hiveauthservices.title_sign'
} as const;

const AuthQrCode: FC<{ uri: string }> = ({ uri }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, uri, { width: 240 }).catch((error: unknown) =>
      logger.error(error, 'Drawing the HiveAuth QR code failed')
    );
  }, [uri]);
  return <canvas ref={canvasRef} className="mx-auto" data-testid="hiveauth-qr" />;
};

/**
 * Shows a HiveAuth request: on sign-in the QR code to scan (phones get the `has://` link to open the
 * wallet app first, the QR code below it), then the wait for approval in the wallet app, with Cancel;
 * a failure stays until closed. Resolves once closed.
 */
export const HiveAuthDialog: FC<{ prompt: HiveAuthPrompt } & InstanceProps<void>> = ({
  prompt,
  isOpen = false,
  onResolve
}) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE);
  const state = useSyncExternalStore(prompt.subscribe, prompt.getState, prompt.getState);

  useEffect(() => {
    if (state.phase === 'closed') onResolve();
  }, [state.phase, onResolve]);

  const dismiss = () => (state.phase === 'failed' ? prompt.close() : prompt.cancel());
  const onOpenChange = (open: boolean) => {
    if (!open) dismiss();
  };

  return (
    <Dialog open={isOpen && state.phase !== 'closed'} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[420px]"
        onInteractOutside={(event) => event.preventDefault()}
        data-testid="hiveauth-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t(TITLE_KEYS[prompt.purpose])}</DialogTitle>
          <DialogDescription data-testid="hiveauth-status" role={state.phase === 'failed' ? 'alert' : 'status'}>
            {state.phase === 'connecting' && t('hiveauthservices.connecting')}
            {state.phase === 'scan' && t('hiveauthservices.qrInstructions')}
            {state.phase === 'approve' && t('hiveauthservices.approveOnPhone')}
            {state.phase === 'failed' && t(HIVEAUTH_FAILURE_KEYS[state.failure])}
          </DialogDescription>
        </DialogHeader>
        {state.phase === 'scan' ? (
          <div className="flex flex-col items-center gap-4">
            <a
              href={state.uri}
              className={cn(buttonVariants(), 'w-full sm:hidden')}
              data-testid="hiveauth-open-wallet"
            >
              {t('hiveauthservices.openInWallet')}
            </a>
            <AuthQrCode uri={state.uri} />
          </div>
        ) : null}
        {state.phase === 'failed' ? (
          <Button type="button" variant="secondary" onClick={() => prompt.close()} data-testid="hiveauth-close">
            {t('hiveauthservices.close')}
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => prompt.cancel()} data-testid="hiveauth-cancel">
            {t('login_form.cancel_button')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const HiveAuthDialogModalPromise = create(HiveAuthDialog);
