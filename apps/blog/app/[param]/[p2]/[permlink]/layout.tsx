import React, { PropsWithChildren } from 'react';
import { notFound } from 'next/navigation';
import { isValidUserParam } from '@/blog/utils/validate-links';

// generateMetadata for this route lives in page.tsx: it must run there (with
// searchParams and before the loading boundary streams) so notFound() yields a
// real HTTP 404 - see #930.

export default async function Layout({
  children,
  params
}: PropsWithChildren<{ params: { param: string; p2: string; permlink: string } }>) {
  // Validate p2 param - must start with @ or %40 for valid post URLs
  if (!isValidUserParam(params?.p2)) {
    notFound();
  }

  return <>{children}</>;
}
