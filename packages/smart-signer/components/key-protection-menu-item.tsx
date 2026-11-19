/* The account menu's notice on keys saved unprotected in this browser, until they are moved into safe storage or forgotten */
import { FC } from 'react';
import { DropdownMenuItem } from '@ui/components/dropdown-menu';
import { Icons } from '@ui/components/icons';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import type { KeyProtection } from '@smart-signer/lib/auth/use-key-protection';

const KeyProtectionMenuItem: FC<{ keyProtection: KeyProtection }> = ({ keyProtection }) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });

  if (!keyProtection.hasPlaintextKeys) return null;
  return (
    <>
      <DropdownMenuItem
        className="flex cursor-pointer items-start gap-2 text-xs text-destructive"
        onSelect={keyProtection.protect}
        data-testid="key-protection-menu-item"
      >
        <Icons.warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{t('key_protection.menu_notice')}</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        className="cursor-pointer pl-8 text-xs"
        onSelect={keyProtection.forget}
        data-testid="key-protection-forget-menu-item"
      >
        {t('key_protection.forget_button')}
      </DropdownMenuItem>
    </>
  );
};

export default KeyProtectionMenuItem;
