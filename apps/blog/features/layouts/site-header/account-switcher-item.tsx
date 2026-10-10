import { MouseEvent, useCallback } from 'react';
import { DropdownMenuItem } from '@ui/components/dropdown-menu';
import { Avatar, AvatarImage } from '@ui/components';
import { Icons } from '@ui/components/icons';
import { getUserAvatarUrl } from '@hive/ui';
import { User } from '@smart-signer/types/common';
import { useTranslation } from '@/blog/i18n/client';

interface AccountSwitcherItemProps {
  account: User;
  disabled: boolean;
  onSwitch: (account: User) => void;
  onRemove: (account: User) => void;
}

const AccountSwitcherItem = ({ account, disabled, onSwitch, onRemove }: AccountSwitcherItemProps) => {
  const { t } = useTranslation('common_blog');

  const handleSelect = useCallback(() => onSwitch(account), [account, onSwitch]);

  const handleRemove = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Removing an account must not also select (switch to) it
      event.preventDefault();
      event.stopPropagation();
      onRemove(account);
    },
    [account, onRemove]
  );

  return (
    <DropdownMenuItem
      className="cursor-pointer"
      disabled={disabled}
      onSelect={handleSelect}
      data-testid="account-switcher-item"
    >
      <Avatar className="mr-2 h-5 w-5">
        <AvatarImage src={getUserAvatarUrl(account.username, 'small')} alt="" />
      </Avatar>
      <span className="w-full truncate">{account.username}</span>
      <button
        type="button"
        className="ml-2 rounded p-0.5 opacity-60 hover:bg-background-tertiary hover:opacity-100"
        aria-label={t('navigation.user_menu.remove_account', { username: account.username })}
        title={t('navigation.user_menu.remove_account', { username: account.username })}
        onClick={handleRemove}
        data-testid="account-switcher-remove"
      >
        <Icons.close className="h-3 w-3" />
      </button>
    </DropdownMenuItem>
  );
};

export default AccountSwitcherItem;
