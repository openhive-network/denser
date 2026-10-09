import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Hot posts',
  alternates: { canonical: '/hot' }
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
