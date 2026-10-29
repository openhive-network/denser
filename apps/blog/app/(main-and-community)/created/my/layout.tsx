import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';
import { getTranslation } from '@/blog/i18n/server';
import { NOINDEX_ROBOTS } from '@/blog/lib/seo-robots';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_blog');
  return {
    title: `${t('page_titles.my_community_new')} - Hive`,
    robots: NOINDEX_ROBOTS
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
