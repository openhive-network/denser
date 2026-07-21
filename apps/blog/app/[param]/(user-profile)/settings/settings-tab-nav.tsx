'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@ui/components/link';
import { Tabs, TabsList, TabsTrigger } from '@ui/components/tabs';
import { useTranslation } from '@/blog/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

type SettingsTab = 'profile' | 'google-drive-wallet' | 'appearance';

const SETTINGS_TABS: readonly SettingsTab[] = ['profile', 'google-drive-wallet', 'appearance'];

const SettingsTabNav = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const pathname = usePathname();
  const isMyProfile = user?.isLoggedIn && user?.username === username;

  if (!isMyProfile) return null;

  const basePath = `/@${username}/settings`;
  const segment = pathname?.slice(pathname.lastIndexOf('/') + 1);
  const activeTab: SettingsTab = SETTINGS_TABS.includes(segment as SettingsTab)
    ? (segment as SettingsTab)
    : 'profile';

  return (
    <Tabs value={activeTab} className="mb-4">
      <TabsList className="flex justify-start bg-background-tertiary">
        <TabsTrigger value="profile" className="p-0">
          <Link className="rounded-sm px-3 py-1.5" href={basePath}>
            {t('settings_page.tab_profile')}
          </Link>
        </TabsTrigger>
        <TabsTrigger value="google-drive-wallet" className="p-0">
          <Link className="rounded-sm px-3 py-1.5" href={`${basePath}/google-drive-wallet`}>
            {t('settings_page.tab_google_drive_wallet')}
          </Link>
        </TabsTrigger>
        <TabsTrigger value="appearance" className="p-0">
          <Link className="rounded-sm px-3 py-1.5" href={`${basePath}/appearance`}>
            {t('settings_page.tab_appearance')}
          </Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default SettingsTabNav;
