import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Welcome'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
