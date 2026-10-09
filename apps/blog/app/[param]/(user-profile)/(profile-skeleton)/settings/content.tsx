'use client';

import SettingsForm from '@/blog/features/account-settings/form';
import MutedList from '@/blog/features/account-settings/muted-list';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const SettingsContent = ({ username }: { username: string }) => {
  const { user } = useUserClient();

  return (
    <div className="flex flex-col" data-testid="public-profile-settings">
      {user?.isLoggedIn && user?.username === username ? <SettingsForm username={user.username} /> : null}
      <MutedList username={username} />
    </div>
  );
};

export default SettingsContent;
