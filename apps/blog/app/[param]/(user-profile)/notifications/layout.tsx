import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';
import { getTranslation } from '@/blog/i18n/server';
import { NOINDEX_ROBOTS } from '@/blog/lib/seo-robots';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  const params = await props.params;
  const username = params?.param?.startsWith('%40') ? params.param.replace('%40', '') : params.param;
  const { t } = await getTranslation('common_blog');
  const title = t('page_titles.notifications_for', { username });

  return {
    title,
    robots: NOINDEX_ROBOTS
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
