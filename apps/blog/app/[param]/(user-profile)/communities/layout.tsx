import { Metadata } from 'next';
import React, { PropsWithChildren } from 'react';

export async function generateMetadata({ params }: { params: { param: string } }): Promise<Metadata> {
  const username = params?.param?.startsWith('%40') ? params.param.replace('%40', '') : params.param;
  const title = `Communities ${username}`;

  return {
    title
  };
}

export default function Layout({ children }: PropsWithChildren) {
  return <>{children}</>;
}
