import { useCallback } from 'react';
import { DropdownMenuItem } from '@ui/components/dropdown-menu';
import { Icons } from '@ui/components/icons';
import { KeyType } from '@smart-signer/types/common';
import type { LoginAuthority } from '@smart-signer/lib/auth/login-authority';
import { useTranslation } from '@/wallet/i18n/client';

interface LoginKeyActionProps {
  authority: LoginAuthority;
  /** Starts a login of the same account with `keyType` */
  onSwitchKey: (keyType: KeyType) => void;
}

function otherKeyType(authority: LoginAuthority): KeyType | null {
  if (authority.kind !== 'key') return null;
  return authority.keyType === KeyType.active ? KeyType.posting : KeyType.active;
}

/**
 * Account menu item that moves a session holding one key to the other: up to the active key, or
 * back down to the posting key. None for a signer, which picks the key for each operation.
 */
const LoginKeyAction = ({ authority, onSwitchKey }: LoginKeyActionProps) => {
  const { t } = useTranslation('common_wallet');
  const targetKeyType = otherKeyType(authority);
  const handleSelect = useCallback(() => {
    if (targetKeyType) onSwitchKey(targetKeyType);
  }, [targetKeyType, onSwitchKey]);
  if (!targetKeyType) return null;

  return (
    <DropdownMenuItem className="cursor-pointer" onSelect={handleSelect} data-testid="login-key-action">
      <Icons.keyRound className="mr-2" />
      <span className="w-full">
        {targetKeyType === KeyType.active
          ? t('navigation.user_menu.log_in_with_active_key')
          : t('navigation.user_menu.switch_to_posting_key')}
      </span>
    </DropdownMenuItem>
  );
};

export default LoginKeyAction;
