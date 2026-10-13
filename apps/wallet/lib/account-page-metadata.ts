import { cache } from 'react';
import type { Metadata } from 'next';
import type { FullAccount } from '@hive/common-hiveio-packages/wax';
import { getAccountFull } from '@transaction/lib/hive-api';
import { buildAccountMetadata } from '@transaction/lib/metadata';

/**
 * The metadata of every 404 page. A route that answers 404 returns it from its own generateMetadata
 * as well: Next puts app/not-found.tsx's metadata into the server HTML, but the client applies the
 * route's own metadata after hydration.
 */
export const PAGE_NOT_FOUND_METADATA: Metadata = {
  title: { absolute: 'Page not found - Hive Wallet' }
};

/** The account of a `/@name/...` route, fetched once per request for the [param] layout and the page metadata. */
export const getRouteAccount = cache((username: string): Promise<FullAccount> => getAccountFull(username));

/**
 * Metadata of an account page (`/@name/<tab>`). A param that is not an account, or an account the
 * chain does not have, gets the not-found metadata, as the [param] layout answers both with a 404.
 * When the lookup fails the page still renders, under the root layout's default title.
 */
export async function getAccountPageMetadata(rawParam: string, descriptionText: string): Promise<Metadata> {
  const param = decodeURIComponent(rawParam);
  if (!param.startsWith('@')) {
    return PAGE_NOT_FOUND_METADATA;
  }

  let account: FullAccount;
  try {
    account = await getRouteAccount(param.slice(1));
  } catch {
    // Not logged here: the [param] layout awaits the same cached lookup and logs its failure.
    return {};
  }
  if (!account.name) {
    return PAGE_NOT_FOUND_METADATA;
  }

  const metadata = buildAccountMetadata(account, descriptionText);
  return {
    title: { absolute: metadata.tabTitle },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      images: [metadata.image]
    }
  };
}
