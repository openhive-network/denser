import { cache } from 'react';
import type { Metadata } from 'next';
import type { FullAccount } from '@hive/common-hiveio-packages/wax';
import { getAccountFull } from '@transaction/lib/hive-api';
import { buildAccountMetadata } from '@transaction/lib/metadata';
import { getTranslation } from '@/wallet/i18n/server';

/**
 * The metadata of every 404 page. A route that answers 404 returns it from its own generateMetadata
 * as well: Next puts app/not-found.tsx's metadata into the server HTML, but the client applies the
 * route's own metadata after hydration.
 */
export async function getPageNotFoundMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_wallet');
  return { title: { absolute: `${t('page_titles.page_not_found')} - Hive Wallet` } };
}

/** The account of a `/@name/...` route, fetched once per request for the [param] layout and the page metadata. */
export const getRouteAccount = cache((username: string): Promise<FullAccount> => getAccountFull(username));

/**
 * Metadata of an account page (`/@name/<tab>`). A param that is not an account, or an account the
 * chain does not have, gets the not-found metadata, as the [param] layout answers both with a 404.
 * When the lookup fails the page still renders, under the root layout's default title.
 * `titleKey` is the common_wallet key of the tab's name, e.g. "Balances".
 */
export async function getAccountPageMetadata(rawParam: string, titleKey: string): Promise<Metadata> {
  const param = decodeURIComponent(rawParam);
  if (!param.startsWith('@')) {
    return getPageNotFoundMetadata();
  }

  let account: FullAccount;
  try {
    account = await getRouteAccount(param.slice(1));
  } catch {
    // Not logged here: the [param] layout awaits the same cached lookup and logs its failure.
    return {};
  }
  if (!account.name) {
    return getPageNotFoundMetadata();
  }

  const { t } = await getTranslation('common_wallet');
  const metadata = buildAccountMetadata(account, t(titleKey));
  return {
    title: { absolute: metadata.tabTitle },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      images: [metadata.image]
    }
  };
}
