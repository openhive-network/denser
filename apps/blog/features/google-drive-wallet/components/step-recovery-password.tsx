'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Alert, AlertDescription } from '@ui/components/alert';
import { useTranslation } from '@/blog/i18n/client';

interface StepRecoveryPasswordProps {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
  disabled: boolean;
}

export function StepRecoveryPassword({
  password,
  confirmPassword,
  showPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onToggleShowPassword,
  disabled
}: StepRecoveryPasswordProps) {
  const { t } = useTranslation('common_blog');
  const passwordsMatch = password === confirmPassword;
  const isPasswordValid = password.length >= 8 && passwordsMatch;

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">
        {t('google_drive_wallet.create_dialog.recovery_password_label')}
      </Label>

      <Alert variant="destructive">
        <AlertDescription>
          {t('google_drive_wallet.create_dialog.password_warning')}
        </AlertDescription>
      </Alert>

      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={t('google_drive_wallet.create_dialog.password_placeholder')}
          className="pr-10"
          disabled={disabled}
          autoComplete="new-password"
        />
        <button
          type="button"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={onToggleShowPassword}
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <Input
        type={showPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => onConfirmPasswordChange(e.target.value)}
        placeholder={t('google_drive_wallet.create_dialog.confirm_password_placeholder')}
        disabled={disabled}
        autoComplete="new-password"
      />

      {(password || confirmPassword) && (
        <div className="space-y-1">
          {password.length > 0 && password.length < 8 && (
            <p className="text-xs text-amber-600">
              {t('google_drive_wallet.create_dialog.password_min_length')}
            </p>
          )}
          {password.length >= 8 && confirmPassword && !passwordsMatch && (
            <p className="text-xs text-destructive">
              {t('google_drive_wallet.create_dialog.passwords_no_match')}
            </p>
          )}
          {isPasswordValid && (
            <p className="text-xs text-green-600">
              {t('google_drive_wallet.create_dialog.password_valid')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
