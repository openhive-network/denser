import { getApiSetNodes } from '@transaction/lib/chain';
import { getLiteNode } from '@transaction/lib/lite-api';
import LiteApiSeedClient from './lite-api-seed-client';

/**
 * Hands the server's `lite.get_info` answer to the browser, keyed by the node it read `lite.*` from
 * (or, when no node of the lite API set is lite-aware, by the set's first node), so a browser asking
 * the same node does not ask it again on page load. The answer comes from the server's probe cache,
 * which its own post reads share.
 */
export default async function LiteApiSeed() {
  const lite = await getLiteNode();
  const endpoint = lite?.node ?? (await getApiSetNodes('lite'))[0];
  if (!endpoint) return null;
  return <LiteApiSeedClient endpoint={endpoint} info={lite?.info ?? null} />;
}
