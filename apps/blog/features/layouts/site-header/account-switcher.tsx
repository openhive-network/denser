import { useCallback } from 'react';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@ui/components/dropdown-menu';
import { Icons } from '@ui/components/icons';
import { toast } from '@ui/components/hooks/use-toast';
import { User } from '@smart-signer/types/common';
import { useAccounts } from '@smart-signer/lib/auth/use-accounts';
import { useSwitchAccount } from '@smart-signer/lib/auth/use-switch-account';
import { useRemoveAccount } from '@smart-signer/lib/auth/use-remove-account';
import { useTranslation } from '@/blog/i18n/client';
import AccountSwitcherItem from './account-switcher-item';

interface AccountSwitcherProps {
  user: User;
  onAddAccount: () => void;
}

/** User menu section listing the other signed-in accounts to switch to, and a way to add one. */
const AccountSwitcher = ({ user, onAddAccount }: AccountSwitcherProps) => {
  const { t } = useTranslation('common_blog');
  const accounts = useAccounts();
  const switchAccount = useSwitchAccount({
    onError: (username) =>
      toast({
        title: t('navigation.user_menu.switch_account_failed', { username }),
        variant: 'destructive'
      })
  });
  const removeAccount = useRemoveAccount({
    onError: (account) =>
      toast({
        title: t('navigation.user_menu.remove_account_failed', { username: account.username }),
        variant: 'destructive'
      })
  });
  const otherAccounts = accounts.filter((account) => account.username !== user.username);
  const isPending = switchAccount.isPending || removeAccount.isPending;

  const { mutate: mutateSwitch } = switchAccount;
  const handleSwitch = useCallback((account: User) => mutateSwitch({ username: account.username }), [mutateSwitch]);

  const { mutate: mutateRemove } = removeAccount;
  const handleRemove = useCallback((account: User) => mutateRemove({ account }), [mutateRemove]);

  return (
    <>
      <DropdownMenuSeparator />
      {otherAccounts.length > 0 ? (
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {t('navigation.user_menu.switch_account')}
        </DropdownMenuLabel>
      ) : null}
      {otherAccounts.map((account) => (
        <AccountSwitcherItem
          key={account.username}
          account={account}
          disabled={isPending}
          onSwitch={handleSwitch}
          onRemove={handleRemove}
        />
      ))}
      <DropdownMenuItem className="cursor-pointer" onSelect={onAddAccount} data-testid="account-switcher-add">
        <Icons.userPlus className="mr-2" />
        <span className="w-full">{t('navigation.user_menu.add_account')}</span>
      </DropdownMenuItem>
    </>
  );
};

export default AccountSwitcher;
