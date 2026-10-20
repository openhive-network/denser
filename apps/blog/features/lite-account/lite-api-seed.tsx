import { getReadChain } from '@transaction/lib/chain';
import { getLiteApiInfo } from '@transaction/lib/lite-api';
import LiteApiSeedClient from './lite-api-seed-client';

/**
 * Hands the server's `lite.get_info` answer of its API node to the browser, so a browser reading
 * from the same node does not ask it again on page load. The answer comes from the server's probe
 * cache, which its own post reads share.
 */
export default async function LiteApiSeed() {
  const info = await getLiteApiInfo();
  return <LiteApiSeedClient endpoint={getReadChain().endpointUrl} info={info} />;
}
