import { useQuery } from '@tanstack/react-query';

import { getAccountNotifications } from '@/blog/lib/bridge';
import LayoutProfile from '@/blog/components/common/profile-layout';
import NotificationActivities from '@/blog/components/notification-activities';
import { useSiteParams } from '@hive/ui/components/hooks/use-site-params';
import Loading from '@hive/ui/components/loading';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { i18n } from '@/blog/next-i18next.config';

export default function UserNotifications() {
  const { username } = useSiteParams();
  const {
    isLoading,
    error,
    data
  } = useQuery(['accountNotification', username], () => getAccountNotifications(username), {
    enabled: !!username
  });

  if (isLoading) return <Loading loading={isLoading} />;

  return (
    <LayoutProfile>
      <div className="flex w-full flex-col">
        {data && data.length>0?<NotificationActivities data={data} username={username} />: <div
                key="empty"
                className="px-4 py-6 mt-12 bg-green-100 dark:bg-slate-700 text-sm"
                data-testid="user-has-not-had-any-notifications-yet"
              >
                @{username} hasn&apos;t had any notifications yet.
              </div>}
      </div>
    </LayoutProfile>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  return {
    props: {
      ...(await serverSideTranslations(req.cookies.NEXT_LOCALE! || i18n.defaultLocale, ['common_blog']))
    }
  };
};
