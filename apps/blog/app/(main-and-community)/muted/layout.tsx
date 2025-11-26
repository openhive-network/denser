import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Muted posts'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
