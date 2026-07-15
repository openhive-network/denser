'use client';

import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@ui/components/dialog';
import { Button } from '@ui/components/button';
import { Alert, AlertDescription } from '@ui/components/alert';
import { validateWifKey } from '@smart-signer/lib/validators/validate-wif-key';
import type { TRole } from '@smart-signer/lib/google-drive-wallet-manager';
import { useTranslation } from '@/blog/i18n/client';
import { StepAccountName } from './step-account-name';
import { StepPrivateKeys, AVAILABLE_ROLES, type KeyField } from './step-private-keys';
import { StepRecoveryPassword } from './step-recovery-password';

interface CreateWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAddingToExistingWallet?: boolean;
  initialAccountName?: string;
  onCreateWallet: (
    password: string,
    accountName: string,
    keys: Partial<Record<TRole, string>>
  ) => Promise<void>;
  onAddKeys: (accountName: string, role: TRole, privateKey: string) => Promise<void>;
}

export function CreateWalletDialog({
  open,
  onOpenChange,
  isAddingToExistingWallet = false,
  initialAccountName = '',
  onCreateWallet,
  onAddKeys
}: CreateWalletDialogProps) {
  const { t } = useTranslation('common_blog');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountName, setAccountName] = useState(initialAccountName);
  const [keyFields, setKeyFields] = useState<KeyField[]>([
    { role: 'posting', privateKey: '', showKey: false }
  ]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedRoles = keyFields.map((k) => k.role).filter(Boolean);
  const availableRolesToAdd = AVAILABLE_ROLES.filter((r) => !usedRoles.includes(r));
  const hasAtLeastOneKey = keyFields.some((k) => k.role && k.privateKey.trim());
  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = password.length >= 8 && passwordsMatch;
  const totalSteps = isAddingToExistingWallet ? 2 : 3;

  const resetForm = useCallback(() => {
    setStep(1);
    setAccountName(initialAccountName);
    setKeyFields([{ role: 'posting', privateKey: '', showKey: false }]);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError(null);
    setIsProcessing(false);
  }, [initialAccountName]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function addKeyField() {
    if (availableRolesToAdd.length === 0) return;
    setKeyFields((prev) => [
      ...prev,
      { role: availableRolesToAdd[0], privateKey: '', showKey: false }
    ]);
  }

  function removeKeyField(index: number) {
    if (keyFields.length <= 1) return;
    setKeyFields((prev) => prev.filter((_, i) => i !== index));
  }

  function updateKeyField(index: number, updates: Partial<KeyField>) {
    setKeyFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }

  function validateKeys(): boolean {
    for (const field of keyFields) {
      if (field.privateKey.trim() && field.role) {
        const validationError = validateWifKey(field.privateKey.trim());
        if (validationError) {
          setError(
            `${t('google_drive_wallet.create_dialog.invalid_key_for_role')} ${field.role}: ${validationError}`
          );
          return false;
        }
      }
    }
    return true;
  }

  function handleNext() {
    setError(null);
    if (step === 1) {
      if (!accountName.trim()) {
        setError(t('google_drive_wallet.create_dialog.account_name_required'));
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!hasAtLeastOneKey) {
        setError(t('google_drive_wallet.create_dialog.at_least_one_key'));
        return;
      }
      if (!validateKeys()) return;
      if (isAddingToExistingWallet) {
        void handleSubmit();
      } else {
        setStep(3);
      }
    }
  }

  function handleBack() {
    setError(null);
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  async function handleSubmit() {
    setError(null);
    setIsProcessing(true);
    try {
      const validKeys = keyFields.filter((k) => k.role && k.privateKey.trim());
      if (isAddingToExistingWallet) {
        for (const key of validKeys) {
          await onAddKeys(accountName.trim(), key.role as TRole, key.privateKey.trim());
        }
      } else {
        if (!isPasswordValid) {
          setError(t('google_drive_wallet.create_dialog.password_invalid'));
          return;
        }
        const keysRecord: Partial<Record<TRole, string>> = {};
        for (const key of validKeys) {
          keysRecord[key.role as TRole] = key.privateKey.trim();
        }
        await onCreateWallet(password, accountName.trim(), keysRecord);
      }
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  }

  const canProceed =
    step === 1 ? !!accountName.trim() : step === 2 ? hasAtLeastOneKey : isPasswordValid;

  const isLastStep = step === totalSteps || (step === 2 && isAddingToExistingWallet);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isAddingToExistingWallet
              ? t('google_drive_wallet.create_dialog.title_add_keys')
              : t('google_drive_wallet.create_dialog.title_create')}
          </DialogTitle>
          <DialogDescription>
            {t('google_drive_wallet.create_dialog.step_indicator', {
              current: step,
              total: totalSteps
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <StepAccountName
              accountName={accountName}
              onAccountNameChange={setAccountName}
              disabled={isProcessing}
            />
          )}

          {step === 2 && (
            <StepPrivateKeys
              keyFields={keyFields}
              onAddKeyField={addKeyField}
              onRemoveKeyField={removeKeyField}
              onUpdateKeyField={updateKeyField}
              availableRolesToAdd={availableRolesToAdd}
              usedRoles={usedRoles}
              disabled={isProcessing}
            />
          )}

          {step === 3 && !isAddingToExistingWallet && (
            <StepRecoveryPassword
              password={password}
              confirmPassword={confirmPassword}
              showPassword={showPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onToggleShowPassword={() => setShowPassword((prev) => !prev)}
              disabled={isProcessing}
            />
          )}
        </div>

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isProcessing}>
              {t('google_drive_wallet.create_dialog.back')}
            </Button>
          )}

          {isLastStep ? (
            <Button
              onClick={() => void handleSubmit()}
              disabled={!canProceed || isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing
                ? isAddingToExistingWallet
                  ? t('google_drive_wallet.create_dialog.adding_keys')
                  : t('google_drive_wallet.create_dialog.creating_wallet')
                : isAddingToExistingWallet
                  ? t('google_drive_wallet.create_dialog.submit_add_keys')
                  : t('google_drive_wallet.create_dialog.submit_create')}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed || isProcessing}>
              {t('google_drive_wallet.create_dialog.next')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
