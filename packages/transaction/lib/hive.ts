import { AccountAuthorityUpdateOperation } from '@hiveio/wax';
import { getLogger } from '@ui/lib/logging';
import { IListWitnessVotes, IPost } from './extended-hive.chain';
import { getChain } from './chain';

const logger = getLogger('app');

export interface IDynamicProps {
  hivePerMVests: number;
  base: number;
  quote: number;
  fundRewardBalance: number;
  fundRecentClaims: number;
  hbdPrintRate: number;
  hbdInterestRate: number;
  headBlock: number;
  totalVestingFund: number;
  totalVestingShares: number;
  virtualSupply: number;
  vestingRewardPercent: number;
}

export const getPost = async (username: string, permlink: string): Promise<IPost> => {
  const chain = await getChain();
  return chain.api.condenser_api.get_content([username, permlink]);
};

export const getListWitnessVotes = async (
  username: string,
  limit: number,
  order: string
): Promise<IListWitnessVotes> => {
  const chain = await getChain();
  return chain.api.database_api.list_witness_votes({ start: [username, ''], limit, order });
};

export const getAuthority = async (username: string): Promise<AccountAuthorityUpdateOperation> => {
  const chain = await getChain();
  const operation = await AccountAuthorityUpdateOperation.createFor(chain, username);

  return operation;
};
export interface TransactionOptions {
  observe?: boolean;
}
export type LevelAuthority = Parameters<
  Awaited<ReturnType<(typeof AccountAuthorityUpdateOperation)['createFor']>>['role']
>[0];

const keyTypes = ['active', 'owner', 'posting', 'memo'] as const;

export const getPrivateKeys = async (
  username: string,
  password: string
): Promise<
  {
    type: (typeof keyTypes)[number];
    privateKey: string;
    correctKey: boolean;
  }[]
> => {
  const chain = await getChain();
  const keys = await Promise.all(
    keyTypes.map(async (keyType) => {
      const key = await chain.getPrivateKeyFromPassword(username, keyType, password);
      const operation = (await AccountAuthorityUpdateOperation.createFor(chain, username)).role(keyType);
      const checkKey =
        operation.level === 'memo'
          ? operation.value === key.associatedPublicKey
          : operation.has(key.associatedPublicKey);
      return { type: keyType, privateKey: key.wifPrivateKey, correctKey: checkKey };
    })
  );
  return keys;
};
