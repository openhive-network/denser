import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';
import { profileCanonical } from '@/blog/lib/profile-canonical';
import { getTranslation } from '@/blog/i18n/server';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  const params = await props.params;
  const username = params?.param?.startsWith('%40') ? params.param.replace('%40', '') : params.param;
  const { t } = await getTranslation('common_blog');
  const title = t('page_titles.user_communities', { username });

  return {
    title,
    alternates: profileCanonical(params.param, 'communities')
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
