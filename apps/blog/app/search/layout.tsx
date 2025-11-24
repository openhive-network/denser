import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Search'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
