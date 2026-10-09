import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'New posts',
  alternates: { canonical: '/created' }
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
