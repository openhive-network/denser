import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isTransportError } from '@transaction/lib/wax-errors';
import { getProfileLiteAccount } from '@/blog/lib/profile-cache';
import { getPageNotFoundMetadata } from '@/blog/lib/not-found-metadata';
import { ServiceUnavailableError } from '@/blog/lib/service-unavailable';
import { getTranslation } from '@/blog/i18n/server';
import { isLiteSocialNode } from '@/blog/lib/hive-account-route';
import { authorDisplayName } from './lite-did';
import LiteProfileLayout from './lite-profile-layout';

// A lookup that failed says nothing about whether the account exists: answer 503, never a 404.
const readLiteProfile = (did: string) =>
  getProfileLiteAccount(did).catch((error: unknown) => {
    throw isTransportError(error) ? new ServiceUnavailableError(error) : error;
  });

/** The metadata of a lite account's profile; the not-found one where the node has no such profile. */
export async function getLiteProfileMetadata(did: string): Promise<Metadata> {
  const profile = await getProfileLiteAccount(did).catch(() => null);
  if (!profile) return getPageNotFoundMetadata();
  const { t } = await getTranslation('common_blog');
  const title = t('lite_account.profile.page_title', { name: authorDisplayName(did) });
  return { title: { default: title, template: '%s - Hive' } };
}

/**
 * The profile of a lite account (`did`), served by a node whose `lite.get_profile` knows it; the
 * not-found page on a node without lite support or for a DID it does not know.
 */
export default async function LiteProfileRoute({ did, children }: { did: string; children: ReactNode }) {
  const [profile, social] = await Promise.all([readLiteProfile(did), isLiteSocialNode()]);
  if (!profile) notFound();
  return (
    <LiteProfileLayout profile={profile} social={social}>
      {children}
    </LiteProfileLayout>
  );
}
