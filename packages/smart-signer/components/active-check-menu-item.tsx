/* The account menu's setting of a safe-storage session: whether active-key operations ask every time */
import { FC } from 'react';
import { DropdownMenuCheckboxItem } from '@ui/components/dropdown-menu';
import { toast } from '@ui/components/hooks/use-toast';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { getLogger } from '@ui/lib/logging';
import { isUserCancelled } from '@ui/lib/user-cancelled';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { useActiveCheckSetting } from '@smart-signer/lib/auth/use-active-check-setting';
import { changeActiveCheck } from '@smart-signer/lib/auth/change-active-check';
import { LoginType, type User } from '@smart-signer/types/common';

const logger = getLogger('app');

const ActiveCheckMenuItem: FC<{ user: User }> = ({ user }) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const isSafeStorage = user.loginType === LoginType.hbauth;
  const [requireActiveCheck, setRequireActiveCheck] = useActiveCheckSetting(isSafeStorage ? user.username : undefined);

  if (!isSafeStorage || requireActiveCheck === undefined) return null;

  const toggle = async () => {
    const changed = !requireActiveCheck;
    try {
      await changeActiveCheck(user.username, changed);
      setRequireActiveCheck(changed);
      toast({
        description: t(changed ? 'active_check.turned_on' : 'active_check.turned_off'),
        variant: 'success'
      });
    } catch (error) {
      if (isUserCancelled(error)) return;
      logger.error(error, 'Changing the check before active-key operations of %s failed', user.username);
      toast({ description: t('active_check.change_failed'), variant: 'destructive' });
    }
  };

  return (
    <DropdownMenuCheckboxItem
      className="cursor-pointer text-xs"
      checked={requireActiveCheck}
      onSelect={toggle}
      data-testid="active-check-menu-item"
    >
      {t('active_check.menu_label')}
    </DropdownMenuCheckboxItem>
  );
};

export default ActiveCheckMenuItem;
