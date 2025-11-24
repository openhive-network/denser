import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'My Community / Hot - Hive'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
