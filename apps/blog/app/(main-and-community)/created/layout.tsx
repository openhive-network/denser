import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'New posts'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
