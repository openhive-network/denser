import { useCallback } from 'react';
import { DropdownMenuItem } from '@ui/components/dropdown-menu';
import { Icons } from '@ui/components/icons';
import { KeyType } from '@smart-signer/types/common';
import { missingKeyType, type LoginAuthority } from '@smart-signer/lib/auth/login-authority';
import { useTranslation } from '@/blog/i18n/client';

interface LoginKeyActionProps {
  authority: LoginAuthority;
  /** Starts a login of the same account with `keyType` */
  onSwitchKey: (keyType: KeyType) => void;
  /** Adds the `keyType` key to the session's safe storage */
  onAddKey: (keyType: KeyType) => void;
}

const LABEL_KEYS = {
  add: {
    [KeyType.active]: 'navigation.user_menu.add_active_key',
    [KeyType.posting]: 'navigation.user_menu.add_posting_key'
  },
  switch: {
    [KeyType.active]: 'navigation.user_menu.log_in_with_active_key',
    [KeyType.posting]: 'navigation.user_menu.switch_to_posting_key'
  }
} as const;

function toKeyType(keyType: ReturnType<typeof missingKeyType>): KeyType | null {
  if (keyType === KeyType.active) return KeyType.active;
  if (keyType === KeyType.posting) return KeyType.posting;
  return null;
}

/**
 * Account menu item for the key a session lacks: adds it to safe storage when the session can hold
 * both, otherwise moves the session to it (up to the active key, or back down to the posting key).
 * None when the session holds both keys, or for a signer, which picks the key for each operation.
 */
const LoginKeyAction = ({ authority, onSwitchKey, onAddKey }: LoginKeyActionProps) => {
  const { t } = useTranslation('common_blog');
  const targetKeyType = toKeyType(missingKeyType(authority));
  const canAddKey = authority.kind === 'key' && authority.canAddKey;
  const handleSelect = useCallback(() => {
    if (!targetKeyType) return;
    if (canAddKey) onAddKey(targetKeyType);
    else onSwitchKey(targetKeyType);
  }, [targetKeyType, canAddKey, onAddKey, onSwitchKey]);
  if (!targetKeyType) return null;

  return (
    <DropdownMenuItem className="cursor-pointer" onSelect={handleSelect} data-testid="login-key-action">
      <Icons.keyRound className="mr-2" />
      <span className="w-full">{t(LABEL_KEYS[canAddKey ? 'add' : 'switch'][targetKeyType])}</span>
    </DropdownMenuItem>
  );
};

export default LoginKeyAction;
