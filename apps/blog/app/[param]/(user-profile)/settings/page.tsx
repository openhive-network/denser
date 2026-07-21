'use client';

import SettingsForm from '@/blog/features/account-settings/form';
import MutedList from '@/blog/features/account-settings/muted-list';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useParams } from 'next/navigation';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';

const SettingsProfilePage = () => {
  const params = useParams<{ param: string }>();
  const username = extractUsernameFromParam(params?.param ?? '') ?? '';
  const { user } = useUserClient();
  const isMyProfile = user?.isLoggedIn && user?.username === username;

  if (isMyProfile) {
    return (
      <>
        <SettingsForm username={user.username} />
        <MutedList username={username} />
      </>
    );
  }

  return <MutedList username={username} />;
};

export default SettingsProfilePage;
