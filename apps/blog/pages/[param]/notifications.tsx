import { useQuery } from '@tanstack/react-query';
import { getAccountNotifications } from '@transaction/lib/bridge';
import LayoutProfile from '@/blog/components/common/profile-layout';
import NotificationActivities from '@/blog/components/notification-activities';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import Loading from '@ui/components/loading';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { getServerSidePropsDefault } from '../../lib/get-translations';

export const getServerSideProps: GetServerSideProps = getServerSidePropsDefault;

export default function UserNotifications() {
  const { t } = useTranslation('common_blog');
  const { username } = useSiteParams();
  const { isLoading, error, data } = useQuery(
    ['AccountNotification', username],
    () => getAccountNotifications(username),
    {
      enabled: !!username
    }
  );
  if (isLoading) return <Loading loading={isLoading} />;

  return (
    <LayoutProfile>
      <div className="flex w-full flex-col">
        {data && data.length > 0 ? (
          <NotificationActivities data={data} username={username} />
        ) : (
          <div
            key="empty"
            className="mt-12 bg-green-100 px-4 py-6 text-sm dark:bg-slate-700"
            data-testid="user-has-not-had-any-notifications-yet"
          >
            {t('user_profile.no_notifications_yet', { username: username })}
          </div>
        )}
      </div>
    </LayoutProfile>
  );
}
