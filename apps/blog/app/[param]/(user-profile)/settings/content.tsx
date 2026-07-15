'use client';

import { lazy, Suspense } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import SettingsForm from '@/blog/features/account-settings/form';
import MutedList from '@/blog/features/account-settings/muted-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { Loader2 } from 'lucide-react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const LazyGoogleDriveKeyManager = lazy(() =>
  import('@/blog/features/google-drive-wallet/components/google-drive-key-manager').then((m) => ({
    default: m.GoogleDriveKeyManager
  }))
);

const SettingsContent = ({ username }: { username: string }) => {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  const isMyProfile = user?.isLoggedIn && user?.username === username;

  return (
    <div className="flex flex-col" data-testid="public-profile-settings">
      {isMyProfile ? (
        <Tabs defaultValue="profile">
          <TabsList className="mb-4 bg-background-tertiary">
            <TabsTrigger value="profile">
              {t('settings_page.tab_profile')}
            </TabsTrigger>
            <TabsTrigger value="google-drive-wallet">
              {t('settings_page.tab_google_drive_wallet')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <SettingsForm username={user.username} />
            <MutedList username={username} />
          </TabsContent>

          <TabsContent value="google-drive-wallet">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <LazyGoogleDriveKeyManager />
            </Suspense>
          </TabsContent>
        </Tabs>
      ) : (
        <MutedList username={username} />
      )}
    </div>
  );
};

export default SettingsContent;
