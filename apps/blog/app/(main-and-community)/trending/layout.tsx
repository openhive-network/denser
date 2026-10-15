import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';
import { getTranslation } from '@/blog/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_blog');
  return {
    title: t('page_titles.trending_posts'),
    alternates: { canonical: '/trending' }
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
