import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Trending posts'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
