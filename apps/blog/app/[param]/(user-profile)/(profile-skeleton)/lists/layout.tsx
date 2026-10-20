import { Metadata } from 'next';
import { getTranslation } from '@/blog/i18n/server';
import HiveAccountLayout from '@/blog/lib/hive-account-route';
import { getPageNotFoundMetadata } from '@/blog/lib/not-found-metadata';
import { extractHiveAccountFromParam } from '@/blog/utils/validate-links';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  if (!extractHiveAccountFromParam((await props.params).param)) return getPageNotFoundMetadata();
  const { t } = await getTranslation('common_blog');
  return {
    title: t('page_titles.manage_lists')
  };
}

export default HiveAccountLayout;
