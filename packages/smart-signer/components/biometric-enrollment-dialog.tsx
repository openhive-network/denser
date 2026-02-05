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
import { useState, useEffect, FC } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { Icons } from '@ui/components/icons';
import { getLogger } from '@hive/ui/lib/logging';
import { createCredential } from '@smart-signer/lib/webauthn';
import { setStorageItem, getStorageItem, removeStorageItem, StorageTTL } from '@hive/ui/lib/storage-with-ttl';
import { useTranslation } from 'react-i18next';

const logger = getLogger('biometric-enrollment');

const BIOMETRIC_DISMISSED_KEY = 'gdrive_biometric_dismissed';

export interface BiometricEnrollmentDialogProps {
  username: string;
  wif: string;
}

export type BiometricEnrollmentResult =
  | { enrolled: true; credentialId: string }
  | { enrolled: false; reason: 'cancelled' | 'error' | 'dismissed' | 'dont_ask_again' };

export const BiometricEnrollmentDialog: FC<
  BiometricEnrollmentDialogProps & InstanceProps<BiometricEnrollmentResult>
> = ({ isOpen = false, onResolve, username, wif }) => {
  const { t } = useTranslation('common_blog');
  const [open, setOpen] = useState(isOpen);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync isOpen prop with open state (required for react-modal-promise component reuse)
  useEffect(() => {
    if (isOpen !== open) {
      setOpen(isOpen);
    }
  }, [isOpen, open]);

  const onOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value && !isEnrolling) {
      onResolve({ enrolled: false, reason: 'cancelled' });
    }
  };

  const onInteractOutside = (e: CustomEvent) => {
    if (isEnrolling) {
      e.preventDefault();
    }
  };

  const handleEnable = async () => {
    setIsEnrolling(true);
    setError(null);

    try {
      const result = await createCredential({ username, wif });

      if (result.success) {
        logger.info('Biometric enrollment successful for user: %s', username);
        setOpen(false);
        onResolve({ enrolled: true, credentialId: result.credentialId });
      } else {
        if (result.cancelled) {
          setError(t('login_form.biometric_enrollment_cancelled'));
        } else {
          setError(result.error ?? null);
        }
        setIsEnrolling(false);
      }
    } catch (err) {
      logger.error('Biometric enrollment error: %o', err);
      setError(err instanceof Error ? err.message : t('login_form.biometric_enrollment_error'));
      setIsEnrolling(false);
    }
  };

  const handleNotNow = () => {
    setOpen(false);
    onResolve({ enrolled: false, reason: 'dismissed' });
  };

  const handleDontAskAgain = () => {
    setStorageItem(BIOMETRIC_DISMISSED_KEY, true, StorageTTL.PERMANENT);
    setOpen(false);
    onResolve({ enrolled: false, reason: 'dont_ask_again' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" onInteractOutside={onInteractOutside}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.fingerprint className="h-6 w-6 text-primary" />
            {t('login_form.biometric_enrollment_title')}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {t('login_form.biometric_enrollment_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-md bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            {t('login_form.biometric_enrollment_security_note')}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="ghost"
            onClick={handleDontAskAgain}
            disabled={isEnrolling}
            className="text-muted-foreground"
          >
            {t('login_form.biometric_dont_ask_again')}
          </Button>
          <Button variant="outline" onClick={handleNotNow} disabled={isEnrolling}>
            {t('login_form.biometric_not_now')}
          </Button>
          <Button onClick={handleEnable} disabled={isEnrolling} className="flex items-center gap-2">
            {isEnrolling ? (
              <>
                <Icons.spinner className="h-4 w-4 animate-spin" />
                {t('login_form.biometric_setting_up')}
              </>
            ) : (
              <>
                <Icons.fingerprint className="h-4 w-4" />
                {t('login_form.biometric_enable_button')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const BiometricEnrollmentDialogPromise = create(BiometricEnrollmentDialog);

/**
 * Checks if user has dismissed biometric enrollment permanently.
 */
export function isBiometricEnrollmentDismissed(): boolean {
  if (typeof window === 'undefined') return false;

  const dismissed = getStorageItem<boolean>(BIOMETRIC_DISMISSED_KEY);
  return dismissed === true;
}

/**
 * Resets the biometric enrollment dismissal flag.
 */
export function resetBiometricEnrollmentDismissal(): void {
  if (typeof window === 'undefined') return;
  removeStorageItem(BIOMETRIC_DISMISSED_KEY);
}
