'use client';

import { Button } from '@ui/components/button';
import { cn } from '@ui/lib/utils';
import { useTranslation } from '@/blog/i18n/client';
import type { SecurityWarning } from './lite-authority-state';

const MESSAGE_KEYS: Record<SecurityWarning, string> = {
  unsecured: 'lite_account.passkey.warning_unsecured',
  add_backup: 'lite_account.passkey.warning_add_backup'
};

type Props = { warning: SecurityWarning | null; onSecure: () => void; className?: string };

/**
 * What the account's owner authority warrants telling its holder: that it lives only in this
 * browser (with the Secure action), or, secured by a single passkey, that a backup is advisable.
 */
export default function LiteSecurityNotice({ warning, onSecure, className }: Props) {
  const { t } = useTranslation('common_blog');
  if (!warning) return null;
  const unsecured = warning === 'unsecured';

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border p-3 text-sm',
        unsecured ? 'border-destructive/50 text-destructive' : 'text-muted-foreground',
        className
      )}
      role={unsecured ? 'alert' : 'status'}
      data-testid="lite-security-notice"
      data-warning={warning}
    >
      <p>{t(MESSAGE_KEYS[warning])}</p>
      {unsecured ? (
        <Button
          type="button"
          size="sm"
          className="self-start"
          onClick={onSecure}
          data-testid="lite-security-secure"
        >
          {t('lite_account.passkey.secure_action')}
        </Button>
      ) : null}
    </div>
  );
}
