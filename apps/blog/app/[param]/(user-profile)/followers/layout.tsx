import { Metadata } from 'next';
import { getTranslation } from '@/blog/i18n/server';
import { extractSocialAccountFromParam, SocialAccountLayout } from '@/blog/lib/hive-account-route';
import { authorDisplayName } from '@/blog/features/lite-account/lite-did';
import { getPageNotFoundMetadata } from '@/blog/lib/not-found-metadata';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  const params = await props.params;
  const account = await extractSocialAccountFromParam(params.param);
  if (!account) return getPageNotFoundMetadata();
  const username = authorDisplayName(account);
  const { t } = await getTranslation('common_blog');
  const title = t('page_titles.people_following', { username });

  return {
    title
  };
}

export default SocialAccountLayout;
