import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Pending posts',
  alternates: { canonical: '/payout' }
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
