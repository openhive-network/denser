import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Muted posts',
  alternates: { canonical: '/muted' }
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
