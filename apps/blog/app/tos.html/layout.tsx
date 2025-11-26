import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Terms of Service'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
