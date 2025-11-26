import type { ExtendedNodeApi, ExtendedRestApi } from './extended-hive.chain';
import { hiveChainService } from './hive-chain-service';
import { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';

let chain: TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>> | undefined = undefined;

export async function getChain() {
  if (!chain) chain = await hiveChainService.getHiveChain();
  return chain;
}
