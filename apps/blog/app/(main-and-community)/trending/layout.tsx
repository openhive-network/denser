import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Trending posts',
  alternates: { canonical: '/trending' }
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
