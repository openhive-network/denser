import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

const title = `Manage Lists`;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
