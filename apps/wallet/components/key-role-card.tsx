import type { ReactNode } from 'react';
import { Card, Separator } from '@ui/components';
import { useTranslation } from '@/wallet/i18n/client';

export type KeyRoleName = 'posting' | 'active' | 'owner' | 'memo';

// The `permissions.<role>_key` texts of what each key can do
const ROLE_ACTIONS: Record<KeyRoleName, readonly string[]> = {
  posting: ['publish', 'edit', 'upvote', 'reblog', 'follow', 'mute'],
  active: ['transfer', 'power_hive', 'vote', 'place_order', 'profile_changes', 'publish', 'create'],
  owner: ['reset', 'recover', 'decline'],
  memo: ['send', 'view']
};

// Roles with a second paragraph of advice to the key's holder
const ROLES_WITH_USE: readonly KeyRoleName[] = ['posting', 'active'];

/**
 * What one of an account's keys is for and can do. `own` words it for the key's holder; `children`
 * goes under the explanation (the private key's reveal).
 */
const KeyRoleCard = ({ role, own, children }: { role: KeyRoleName; own: boolean; children?: ReactNode }) => {
  const { t } = useTranslation('common_wallet');
  const prefix = `permissions.${role}_key`;
  return (
    <Card className="flex flex-col text-sm drop-shadow-xl dark:bg-background/95 dark:text-white">
      <h2 className="p-4 text-2xl font-semibold">{t(`${prefix}.name`)}</h2>
      <Separator />
      <div className="flex flex-col md:grid md:grid-cols-[1fr_400px]">
        <div className="border-bg-border flex flex-col gap-8 border-none p-4 md:border-r-2 md:border-solid">
          <p>{t(`${prefix}.info`)}</p>
          {own && ROLES_WITH_USE.includes(role) ? <p>{t(`${prefix}.use`)}</p> : null}
          {children}
        </div>
        <div className="flex flex-col p-4">
          <h3 className="text-lg font-semibold">{t(`${prefix}.permissions`)}</h3>
          <span>{t(own ? `${prefix}.to` : `${prefix}.can`)}</span>
          <ul className="flex list-disc flex-col gap-2 px-5 pt-2">
            {ROLE_ACTIONS[role].map((action) => (
              <li key={action}>{t(`${prefix}.${action}`)}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default KeyRoleCard;
