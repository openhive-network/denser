import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Create a post'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
