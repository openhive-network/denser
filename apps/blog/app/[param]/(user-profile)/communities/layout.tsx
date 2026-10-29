import { Metadata } from 'next';
import { profileCanonical } from '@/blog/lib/profile-canonical';
import { getTranslation } from '@/blog/i18n/server';
import { NOINDEX_ROBOTS } from '@/blog/lib/seo-robots';
import HiveAccountLayout from '@/blog/lib/hive-account-route';
import { getPageNotFoundMetadata } from '@/blog/lib/not-found-metadata';
import { extractHiveAccountFromParam } from '@/blog/utils/validate-links';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  const params = await props.params;
  const username = extractHiveAccountFromParam(params.param);
  if (!username) return getPageNotFoundMetadata();
  const { t } = await getTranslation('common_blog');
  const title = t('page_titles.user_communities', { username });

  return {
    title,
    alternates: profileCanonical(params.param, 'communities'),
    robots: NOINDEX_ROBOTS
  };
}

export default HiveAccountLayout;
