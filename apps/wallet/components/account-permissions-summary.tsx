'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, Separator } from '@ui/components';
import Loading from '@ui/components/loading';
import { Link } from '@hive/ui';
import { getAccountFull } from '@transaction/lib/hive-api';
import { useTranslation } from '@/wallet/i18n/client';
import type { RoleAuthority } from '@/wallet/lib/authority-checks';
import type { KeyMarks } from './hooks/use-key-marks';
import KeyMarkBadges from './key-mark-badges';

interface AccountPermissionsSummaryProps {
  username: string;
  authorityLevels: readonly RoleAuthority[];
  memoKey: string | undefined;
  isLoading: boolean;
  marks: KeyMarks;
  canEdit: boolean;
}

const RoleSummary = ({ role, marks }: { role: RoleAuthority; marks: KeyMarks }) => {
  const { t } = useTranslation('common_wallet');
  const auths = [...role.key_auths, ...role.account_auths];
  return (
    <div className="flex flex-col gap-1" data-testid={`permissions-role-${role.level}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{t(`authorities_page.${role.level}_authority`)}</h3>
        <span className="text-xs">{t('permissions.summary.threshold', { threshold: role.weight_threshold })}</span>
      </div>
      {auths.length ? (
        <ul className="flex flex-col gap-1">
          {role.key_auths.map(({ keyOrAccount, thresholdWeight }) => (
            <li key={keyOrAccount} className="flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-xs">{keyOrAccount}</span>
              <span className="text-xs">{t('permissions.summary.weight', { weight: thresholdWeight })}</span>
              <KeyMarkBadges publicKey={keyOrAccount} marks={marks} />
            </li>
          ))}
          {role.account_auths.map(({ keyOrAccount, thresholdWeight }) => (
            <li key={keyOrAccount} className="flex flex-wrap items-center gap-2">
              <Link href={`/@${keyOrAccount}/permissions`} className="text-xs font-semibold">
                @{keyOrAccount}
              </Link>
              <span className="text-xs">{t('permissions.summary.weight', { weight: thresholdWeight })}</span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-xs">{t('permissions.summary.none')}</span>
      )}
    </div>
  );
};

/** The account's authorities, memo key and recovery account, read-only, linking to the Authorities page. */
const AccountPermissionsSummary = ({
  username,
  authorityLevels,
  memoKey,
  isLoading,
  marks,
  canEdit
}: AccountPermissionsSummaryProps) => {
  const { t } = useTranslation('common_wallet');
  // The profile layout prefetched the account on the server
  const { data: account } = useQuery({
    queryKey: ['profileData', username],
    queryFn: () => getAccountFull(username),
    enabled: !!username
  });

  return (
    <Card className="flex flex-col gap-4 p-4 text-sm drop-shadow-xl dark:bg-background/95 dark:text-white" data-testid="permissions-summary">
      <h2 className="text-2xl font-semibold">{t('permissions.summary.title', { username })}</h2>
      <Separator />
      {isLoading ? (
        <Loading loading />
      ) : authorityLevels.length ? (
        authorityLevels.map((role) => <RoleSummary key={role.level} role={role} marks={marks} />)
      ) : (
        <span>{t('authorities_page.no_data')}</span>
      )}
      <Separator />
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">{t('authorities_page.memo_key')}</h3>
        <span className="break-all font-mono text-xs" data-testid="permissions-memo-key">
          {memoKey ?? account?.memo_key}
        </span>
      </div>
      {account?.recovery_account ? (
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">{t('permissions.summary.recovery_account')}</h3>
          <Link href={`/@${account.recovery_account}/permissions`} data-testid="permissions-recovery-account">
            @{account.recovery_account}
          </Link>
        </div>
      ) : null}
      <Link href={`/@${username}/authorities`} className="w-fit font-bold text-destructive">
        {t(canEdit ? 'permissions.summary.edit_on_authorities' : 'permissions.summary.view_on_authorities')}
      </Link>
    </Card>
  );
};

export default AccountPermissionsSummary;
