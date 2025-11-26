import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'My Community / Muted - Hive'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
