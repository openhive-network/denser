import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'HE payout posts'
};

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
