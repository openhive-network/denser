import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';
import { getTranslation } from '@/blog/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_blog');
  return {
    title: t('page_titles.for_you_posts'),
    alternates: { canonical: '/for-you' },
    // A personal feed: there is nothing for a search engine to index
    robots: { index: false }
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
