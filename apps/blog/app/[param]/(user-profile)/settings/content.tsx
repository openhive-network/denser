'use client';

import SettingsForm from '@/blog/features/account-settings/form';
import HealthChecker from '@/blog/features/account-settings/health-checker';
import MutedList from '@/blog/features/account-settings/muted-list';
import { useUser } from '@smart-signer/lib/auth/use-user';

const SettingsContent = ({ username }: { username: string }) => {
  const { user } = useUser();

  return (
    <div className="flex flex-col" data-testid="public-profile-settings">
      {user?.isLoggedIn && user?.username === username ? <SettingsForm username={user.username} /> : null}
      <HealthChecker />
      <MutedList username={username} />
    </div>
  );
};

export default SettingsContent;
