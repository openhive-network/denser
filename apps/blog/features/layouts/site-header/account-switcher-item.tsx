import { MouseEvent, useCallback } from 'react';
import { DropdownMenuItem } from '@ui/components/dropdown-menu';
import { Avatar, AvatarImage } from '@ui/components';
import { Icons } from '@ui/components/icons';
import { getUserAvatarUrl } from '@hive/ui';
import { User } from '@smart-signer/types/common';
import { useTranslation } from '@/blog/i18n/client';
import LoginMethodIcon from './login-method-icon';

interface AccountSwitcherItemProps {
  account: User;
  disabled: boolean;
  onSwitch: (account: User) => void;
  onRemove: (account: User) => void;
}

const AccountSwitcherItem = ({ account, disabled, onSwitch, onRemove }: AccountSwitcherItemProps) => {
  const { t } = useTranslation('common_blog');
  const removeLabel = t('navigation.user_menu.remove_account', { username: account.username });

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
      <Avatar className="mr-2 h-6 w-6 shrink-0">
        <AvatarImage src={getUserAvatarUrl(account.username, 'small')} alt="" />
      </Avatar>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{account.username}</span>
        <span
          className="flex items-center gap-1 text-xs text-muted-foreground"
          data-testid="account-switcher-login-method"
        >
          <LoginMethodIcon loginType={account.loginType} />
          <span className="truncate">{t(`navigation.user_menu.login_method.${account.loginType}`)}</span>
        </span>
      </span>
      <button
        type="button"
        className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded opacity-70 hover:bg-background-tertiary hover:opacity-100 focus-visible:opacity-100"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={handleRemove}
        data-testid="account-switcher-remove"
      >
        <Icons.close className="h-4 w-4" />
      </button>
    </DropdownMenuItem>
  );
};

export default AccountSwitcherItem;
