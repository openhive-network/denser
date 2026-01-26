import type { ExtendedNodeApi, ExtendedRestApi } from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

let chain: Promise<Chain> | undefined = undefined;

export const getChain = (): Promise<Chain> => chain || (chain = getHiveChainService().getHiveChain().then(wrapChainWithLogging));
