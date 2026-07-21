'use client';

import { lazy, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';
import MutedList from '@/blog/features/account-settings/muted-list';

const LazyGoogleDriveKeyManager = lazy(() =>
  import('@/blog/features/google-drive-wallet/components/google-drive-key-manager').then((m) => ({
    default: m.GoogleDriveKeyManager
  }))
);

const GoogleDriveWalletPage = () => {
  const params = useParams<{ param: string }>();
  const username = extractUsernameFromParam(params?.param ?? '') ?? '';
  const { user } = useUserClient();
  const isMyProfile = user?.isLoggedIn && user?.username === username;

  if (!isMyProfile) {
    return <MutedList username={username} />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LazyGoogleDriveKeyManager />
    </Suspense>
  );
};

export default GoogleDriveWalletPage;
