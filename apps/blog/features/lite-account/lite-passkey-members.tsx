'use client';

import { useTranslation } from '@/blog/i18n/client';
import type { PasskeyRow } from './lite-passkey-label';

const MEMBER_KEYS: Record<PasskeyRow['kind'], string> = {
  passkey: 'lite_account.devices.passkey_member',
  backup: 'lite_account.devices.backup_member'
};

/** The Devices tab's read-only list of the account's passkey owner members (and backups), by their labels. */
export default function LitePasskeyMembers({ rows }: { rows: PasskeyRow[] }) {
  const { t } = useTranslation('common_blog');
  if (!rows.length) return null;

  return (
    <div className="flex flex-col gap-1" data-testid="lite-passkeys">
      <h3 className="font-semibold">{t('lite_account.devices.passkey_title')}</h3>
      <p className="text-sm text-muted-foreground">{t('lite_account.devices.passkey_description')}</p>
      <ul className="divide-y">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex min-w-0 flex-col py-3"
            data-testid="lite-passkey-row"
            data-kind={row.kind}
            data-key={row.key}
          >
            <span className="font-medium" data-testid="lite-passkey-label">
              {t(MEMBER_KEYS[row.kind], {
                label: row.label ?? t('lite_account.devices.unlabelled_passkey'),
                interpolation: { escapeValue: false }
              })}
              {row.active ? null : (
                <span className="ml-2 text-xs text-muted-foreground">{t('lite_account.devices.inactive')}</span>
              )}
            </span>
            <span className="truncate font-mono text-xs text-muted-foreground" translate="no">
              {row.key}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
