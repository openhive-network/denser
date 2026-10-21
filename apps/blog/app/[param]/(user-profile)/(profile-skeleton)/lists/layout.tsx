import { Metadata } from 'next';
import { getTranslation } from '@/blog/i18n/server';
import { extractSocialAccountFromParam, SocialAccountLayout } from '@/blog/lib/hive-account-route';
import { getPageNotFoundMetadata } from '@/blog/lib/not-found-metadata';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  if (!(await extractSocialAccountFromParam((await props.params).param))) return getPageNotFoundMetadata();
  const { t } = await getTranslation('common_blog');
  return {
    title: t('page_titles.manage_lists')
  };
}

export default SocialAccountLayout;
