import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';
import { profileCanonical } from '@/blog/lib/profile-canonical';
import { getTranslation } from '@/blog/i18n/server';
import { authorDisplayName } from '@/blog/features/lite-account/lite-did';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  const params = await props.params;
  const username = authorDisplayName(extractUsernameFromParam(params.param) ?? params.param);
  const { t } = await getTranslation('common_blog');
  const title = t('page_titles.posts_by', { username });

  return {
    title,
    alternates: profileCanonical(params.param, 'posts')
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
