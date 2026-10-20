import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { extractHiveAccountFromParam } from '@/blog/utils/validate-links';

/**
 * The layout of a profile sub-route only Hive accounts have (followers, notifications, lists, …):
 * not-found for a lite account DID, under whose profile layout it would render otherwise. Outside
 * the segment's loading boundary, so the answer is a real HTTP 404; the segment's metadata answers
 * `getPageNotFoundMetadata()` for such a param.
 */
export default async function HiveAccountLayout({
  params,
  children
}: {
  params: Promise<{ param: string }>;
  children: ReactNode;
}) {
  if (!extractHiveAccountFromParam((await params).param)) notFound();
  return <>{children}</>;
}
