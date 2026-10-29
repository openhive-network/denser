'use client';

import { Button } from '@ui/components/button';
import { cn } from '@ui/lib/utils';
import { useTranslation } from '@/blog/i18n/client';
import type { SecurityNotice, SecurityWarning } from './lite-authority-state';

const MESSAGE_KEYS: Record<SecurityWarning, string> = {
  unsecured: 'lite_account.passkey.warning_unsecured',
  add_backup: 'lite_account.passkey.warning_add_backup'
};
/** The messages naming the passkey that secures the account, by its label (an unsecured one has none). */
const NAMED_MESSAGE_KEYS: Partial<Record<SecurityWarning, string>> = {
  add_backup: 'lite_account.passkey.warning_add_backup_named'
};

type Props = { notice: SecurityNotice | null; onSecure: () => void; className?: string };

/**
 * What the account's owner authority warrants telling its holder: that it lives only in this
 * browser (with the Secure action), or, secured by a single passkey, that a backup is advisable;
 * naming the passkey by its label when it has one.
 */
export default function LiteSecurityNotice({ notice, onSecure, className }: Props) {
  const { t } = useTranslation('common_blog');
  if (!notice) return null;
  const { warning, passkeyLabel } = notice;
  const unsecured = warning === 'unsecured';
  const namedKey = passkeyLabel ? NAMED_MESSAGE_KEYS[warning] : undefined;

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
      data-passkey-label={passkeyLabel}
    >
      <p>
        {namedKey
          ? t(namedKey, { label: passkeyLabel, interpolation: { escapeValue: false } })
          : t(MESSAGE_KEYS[warning])}
      </p>
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
