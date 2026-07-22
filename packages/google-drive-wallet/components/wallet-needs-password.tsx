'use client';

import { useGDWTranslation } from '../i18n/context';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface WalletNeedsPasswordProps {
  onLoadKeys: (password: string) => Promise<void>;
  isLoading: boolean;
}

/**
 * Prompts the user to enter their recovery password in order to decrypt
 * and load keys from an existing Google Drive wallet file.
 */
export function WalletNeedsPassword({ onLoadKeys, isLoading }: WalletNeedsPasswordProps) {
  const { t } = useGDWTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    await onLoadKeys(password);
  }

  return (
    <div>
      <h2 className="py-4 text-lg font-semibold leading-5">
        {t('google_drive_wallet.needs_password.title')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('google_drive_wallet.needs_password.description')}
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="gdw-password">
            {t('google_drive_wallet.needs_password.password_placeholder')}
          </Label>
          <div className="relative">
            <Input
              id="gdw-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('google_drive_wallet.needs_password.password_placeholder')}
              disabled={isLoading}
              className="pr-10"
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              aria-label={
                showPassword
                  ? t('google_drive_wallet.needs_password.hide_password')
                  : t('google_drive_wallet.needs_password.show_password')
              }
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={isLoading || !password.trim()}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading
            ? t('google_drive_wallet.needs_password.loading_keys')
            : t('google_drive_wallet.needs_password.load_keys')}
        </Button>
      </form>
    </div>
  );
}
