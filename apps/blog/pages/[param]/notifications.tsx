import { useQuery } from '@tanstack/react-query';
import { getAccountNotifications } from '@transaction/lib/bridge';
import LayoutProfile from '@/blog/components/common/profile-layout';
import NotificationActivities from '@/blog/components/notification-activities';
import { useSiteParams } from '@ui/components/hooks/use-site-params';
import Loading from '@ui/components/loading';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { getDefaultProps, getTranslations } from '../../lib/get-translations';
import Head from 'next/head';
import { getAccountFull } from '@transaction/lib/hive';

export default function UserNotifications({ tabTitle }: { tabTitle: string }) {
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
    <>
      <Head>
        <title>{tabTitle}</title>
      </Head>
      <LayoutProfile>
        <div className="flex w-full flex-col">
          {data && data.length > 0 ? (
            <NotificationActivities data={data} username={username} />
          ) : (
            <div
              key="empty"
              className="border-card-empty-border mt-12 border-2 border-solid bg-card-noContent px-4 py-6 text-sm"
              data-testid="user-has-not-had-any-notifications-yet"
            >
              {t('user_profile.no_notifications_yet', { username: username })}
            </div>
          )}
        </div>
      </LayoutProfile>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const firstParam = (ctx.params?.param as string) ?? '';

  let tabTitle;
  if (firstParam.startsWith('@')) {
    try {
      // Fetch account data
      const data = await getAccountFull(firstParam.split('@')[1]);
      if (data) {
        // If the account data exists, set the username to the account name
        const username = data?.profile?.name ?? data.name;
        tabTitle = '@' + username === firstParam ? `${username} - Hive` : `${username}(${firstParam}) - Hive`;
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  }

  return {
    props: {
      tabTitle,
      ...(await getTranslations(ctx))
    }
  };
};
