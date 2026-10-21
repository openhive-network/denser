import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getLiteApiInfo, liteSocialApp } from '@transaction/lib/lite-api';
import { extractHiveAccountFromParam, extractUsernameFromParam } from '@/blog/utils/validate-links';
import { postAuthorKind } from '@/blog/features/lite-account/lite-did';

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

/** Whether the current API node serves the lite social graph (`lite.get_info.apps.social`). */
export const isLiteSocialNode = async (): Promise<boolean> => liteSocialApp(await getLiteApiInfo().catch(() => null)) !== null;

/**
 * The account of a profile sub-route a lite account has too where the node serves the lite social
 * graph (followers, followed, muted, feed): a Hive account name, or a `did:lite:<name>` on such a
 * node; null for anything else.
 */
export async function extractSocialAccountFromParam(param: string): Promise<string | null> {
  const account = extractUsernameFromParam(param);
  if (account === null) return null;
  const kind = postAuthorKind(account);
  if (kind === 'account') return account;
  return kind === 'lite' && (await isLiteSocialNode()) ? account : null;
}

/** `HiveAccountLayout` for the sub-routes of `extractSocialAccountFromParam`: a DID passes on a social node. */
export async function SocialAccountLayout({
  params,
  children
}: {
  params: Promise<{ param: string }>;
  children: ReactNode;
}) {
  if (!(await extractSocialAccountFromParam((await params).param))) notFound();
  return <>{children}</>;
}
