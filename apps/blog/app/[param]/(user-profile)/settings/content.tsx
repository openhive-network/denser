'use client';

import { lazy, Suspense } from 'react';
import { useTranslation } from '@/blog/i18n/client';
import SettingsForm from '@/blog/features/account-settings/form';
import MutedList from '@/blog/features/account-settings/muted-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/tabs';
import { Loader2 } from 'lucide-react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import ModeToggle from '@/blog/features/layouts/mode-toggle';
import LangToggle from '@/blog/features/layouts/lang-toggle';

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
            <TabsTrigger value="appearance">
              {t('settings_page.tab_appearance')}
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

          <TabsContent value="appearance">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span>{t('navigation.main_nav_bar.theme')}</span>
                <ModeToggle>
                  <button
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    data-testid="settings-theme-mode"
                  >
                    <span className="relative h-4 w-4">
                      <span className="absolute inset-0 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0">&#9728;</span>
                      <span className="absolute inset-0 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100">&#9790;</span>
                    </span>
                    {t('navigation.user_menu.toggle_theme')}
                  </button>
                </ModeToggle>
              </div>
              <div className="flex items-center justify-between">
                <span>{t('navigation.main_nav_bar.language')}</span>
                <LangToggle logged={false} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <MutedList username={username} />
      )}
    </div>
  );
};

export default SettingsContent;
