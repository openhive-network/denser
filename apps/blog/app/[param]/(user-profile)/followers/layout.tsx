import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export async function generateMetadata({
  params
}: {
  params: Promise<{ param: string }>;
}): Promise<Metadata> {
  const { param } = await params;
  const username = param?.startsWith('%40') ? param.replace('%40', '') : param;
  const title = `People following ${username}`;

  return {
    title
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
