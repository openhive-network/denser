import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';
import { getTranslation } from '@/blog/i18n/server';
import { NOINDEX_ROBOTS } from '@/blog/lib/seo-robots';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_blog');
  return {
    title: t('page_titles.create_a_post'),
    robots: NOINDEX_ROBOTS
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
