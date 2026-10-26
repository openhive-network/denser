import { Metadata } from 'next';
import { getTranslation } from '@/blog/i18n/server';
import { extractNotificationsAccountFromParam, NotificationsAccountLayout } from '@/blog/lib/hive-account-route';
import { authorDisplayName } from '@/blog/features/lite-account/lite-did';
import { getPageNotFoundMetadata } from '@/blog/lib/not-found-metadata';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  const params = await props.params;
  const account = await extractNotificationsAccountFromParam(params.param);
  if (!account) return getPageNotFoundMetadata();
  const { t } = await getTranslation('common_blog');
  const title = t('page_titles.notifications_for', { username: authorDisplayName(account) });

  return {
    title
  };
}

export default NotificationsAccountLayout;
