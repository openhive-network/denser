'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@ui/components/dialog';
import { Button } from '@ui/components';
import { Checkbox } from '@ui/components/checkbox';
import { useState, useEffect, FC, useCallback } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { Icons } from '@ui/components/icons';
import { getLogger } from '@hive/ui/lib/logging';
import { authenticateAndDecrypt } from '@smart-signer/lib/webauthn';
import { useTranslation } from 'react-i18next';

const logger = getLogger('biometric-auth');

export interface BiometricAuthDialogProps {
  username: string;
}

export type BiometricAuthDialogResult =
  | { success: true; wif: string; rememberSession: boolean }
  | { success: false; reason: 'cancelled' | 'error' | 'use_password'; error?: string };

export const BiometricAuthDialog: FC<
  BiometricAuthDialogProps & InstanceProps<BiometricAuthDialogResult>
> = ({ isOpen = false, onResolve, username }) => {
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(isOpen);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [rememberSession, setRememberSession] = useState(false);

  const MAX_RETRIES = 3;

  const handleAuthenticate = useCallback(async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await authenticateAndDecrypt({ username });

      if (result.success) {
        logger.info('Biometric authentication successful for user: %s, rememberSession: %s', username, rememberSession);
        setOpen(false);
        onResolve({ success: true, wif: result.wif, rememberSession });
      } else {
        setIsAuthenticating(false);

        if (result.cancelled) {
          setError(t('login_form.biometric_cancelled'));
        } else if (result.credentialNotFound) {
          // Credential not found - fall back to password
          setOpen(false);
          onResolve({ success: false, reason: 'use_password', error: 'Credential not found' });
          return;
        } else {
          setError(result.error ?? null);
        }

        // Increment retry count and check for max retries in a single state update
        // to avoid race conditions from React's state batching
        setRetryCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= MAX_RETRIES) {
            logger.info('Max biometric retries reached, falling back to password');
            setOpen(false);
            onResolve({ success: false, reason: 'use_password', error: 'Max retries reached' });
          }
          return newCount;
        });
      }
    } catch (err) {
      logger.error('Biometric authentication error: %o', err);
      setIsAuthenticating(false);
      setError(err instanceof Error ? err.message : t('login_form.biometric_failed'));

      // Increment retry count and check for max retries in a single state update
      setRetryCount((prev) => {
        const newCount = prev + 1;
        if (newCount >= MAX_RETRIES) {
          setOpen(false);
          onResolve({ success: false, reason: 'use_password', error: 'Max retries reached' });
        }
        return newCount;
      });
    }
  }, [username, rememberSession, onResolve, t]);

  // Sync isOpen prop with open state (required for react-modal-promise component reuse)
  useEffect(() => {
    if (isOpen !== open) {
      setOpen(isOpen);
      // Reset state when dialog opens fresh
      if (isOpen) {
        setError(null);
        setRetryCount(0);
        setIsAuthenticating(false);
        setRememberSession(false);
      }
    }
  }, [isOpen, open]);

  // Start authentication when dialog opens
  useEffect(() => {
    if (open && !isAuthenticating && retryCount === 0) {
      handleAuthenticate();
    }
  }, [open, isAuthenticating, retryCount, handleAuthenticate]);

  const onOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value && !isAuthenticating) {
      onResolve({ success: false, reason: 'cancelled' });
    }
  };

  const onInteractOutside = (e: CustomEvent) => {
    if (isAuthenticating) {
      e.preventDefault();
    }
  };

  const handleUsePassword = () => {
    setOpen(false);
    onResolve({ success: false, reason: 'use_password' });
  };

  const handleRetry = () => {
    handleAuthenticate();
  };

  const remainingAttempts = MAX_RETRIES - retryCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" onInteractOutside={onInteractOutside}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.fingerprint className="h-6 w-6 text-primary" />
            {t('login_form.biometric_auth_title')}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {t('login_form.biometric_auth_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="my-6 flex flex-col items-center justify-center gap-4">
          {isAuthenticating ? (
            <>
              <div className="relative">
                <Icons.fingerprint className="h-16 w-16 animate-pulse text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{t('login_form.biometric_authenticating')}</p>
            </>
          ) : error ? (
            <>
              <div className="rounded-full bg-destructive/10 p-4">
                <Icons.warning className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-center text-sm text-destructive">{error}</p>
              {retryCount < MAX_RETRIES && (
                <p className="text-xs text-muted-foreground">
                  {t(
                    remainingAttempts === 1
                      ? 'login_form.biometric_attempts_remaining'
                      : 'login_form.biometric_attempts_remaining_plural',
                    { count: remainingAttempts }
                  )}
                </p>
              )}
            </>
          ) : (
            <>
              <Icons.fingerprint className="h-16 w-16 text-primary" />
              <p className="text-sm text-muted-foreground">{t('login_form.biometric_ready')}</p>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2 pb-4">
          <Checkbox
            id="remember-session"
            checked={rememberSession}
            onCheckedChange={(checked) => setRememberSession(checked === true)}
            disabled={isAuthenticating}
          />
          <label
            htmlFor="remember-session"
            className="text-sm leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t('login_form.biometric_dont_ask_session')}
          </label>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleUsePassword}
            disabled={isAuthenticating}
            className="w-full sm:w-auto"
          >
            {t('login_form.biometric_use_password')}
          </Button>
          {error && retryCount < MAX_RETRIES && (
            <Button
              onClick={handleRetry}
              disabled={isAuthenticating}
              className="flex w-full items-center gap-2 sm:w-auto"
            >
              <Icons.refresh className="h-4 w-4" />
              {t('login_form.biometric_try_again')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const BiometricAuthDialogPromise = create(BiometricAuthDialog);
