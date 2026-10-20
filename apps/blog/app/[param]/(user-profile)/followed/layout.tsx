import { Metadata } from 'next';
import { getTranslation } from '@/blog/i18n/server';
import HiveAccountLayout from '@/blog/lib/hive-account-route';
import { getPageNotFoundMetadata } from '@/blog/lib/not-found-metadata';
import { extractHiveAccountFromParam } from '@/blog/utils/validate-links';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  const params = await props.params;
  const username = extractHiveAccountFromParam(params.param);
  if (!username) return getPageNotFoundMetadata();
  const { t } = await getTranslation('common_blog');
  const title = t('page_titles.people_followed_by', { username });

  return {
    title
  };
}

export default HiveAccountLayout;
