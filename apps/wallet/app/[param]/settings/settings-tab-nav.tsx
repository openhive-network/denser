'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@hive/ui';
import { Tabs, TabsList, TabsTrigger } from '@ui/components/tabs';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

type SettingsTab = 'settings' | 'google-drive-wallet';

const SETTINGS_TABS: readonly SettingsTab[] = ['settings', 'google-drive-wallet'];

const SettingsTabNav = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_wallet');
  const { user } = useUserClient();
  const pathname = usePathname();
  const isMyProfile = user?.isLoggedIn && user?.username === username;

  if (!isMyProfile) return null;

  const basePath = `/@${username}/settings`;
  const segment = pathname?.slice(pathname.lastIndexOf('/') + 1);
  const activeTab: SettingsTab = SETTINGS_TABS.includes(segment as SettingsTab)
    ? (segment as SettingsTab)
    : 'settings';

  return (
    <Tabs value={activeTab} className="mb-4">
      <TabsList className="flex justify-start bg-background-tertiary">
        <TabsTrigger value="settings" className="p-0">
          <Link className="rounded-sm px-3 py-1.5" href={basePath}>
            {t('settings.tab_appearance')}
          </Link>
        </TabsTrigger>
        <TabsTrigger value="google-drive-wallet" className="p-0">
          <Link className="rounded-sm px-3 py-1.5" href={`${basePath}/google-drive-wallet`}>
            {t('settings.tab_google_drive_wallet')}
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default SettingsTabNav;
