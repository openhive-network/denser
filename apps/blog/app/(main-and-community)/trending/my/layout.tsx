import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'My Community / Trending - Hive'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
