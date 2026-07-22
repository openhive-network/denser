'use client';

import { lazy, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import MutedList from '@/blog/features/account-settings/muted-list';
import { GoogleDriveWalletI18nProvider } from '@hive/google-drive-wallet';
import { useTranslation } from '@/blog/i18n/client';

const LazyGoogleDriveKeyManager = lazy(() =>
  import('@hive/google-drive-wallet').then((m) => ({
    default: m.GoogleDriveKeyManager
  }))
);

const GoogleDriveWalletPage = () => {
  const params = useParams<{ param: string }>();
  const username = extractUsernameFromParam(params?.param ?? '') ?? '';
  const { user } = useUserClient();
  const { t } = useTranslation('common_blog');
  const isMyProfile = user?.isLoggedIn && user?.username === username;

  if (!isMyProfile) {
    return <MutedList username={username} />;
  }

  return (
    <GoogleDriveWalletI18nProvider t={t}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <LazyGoogleDriveKeyManager />
      </Suspense>
    </GoogleDriveWalletI18nProvider>
  );
};

export default GoogleDriveWalletPage;
