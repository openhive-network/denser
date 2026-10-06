import Big from 'big.js';
import type { GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import type { IWitness } from '@hive/common-hiveio-packages/wax';
import { getAccounts, getDynamicGlobalProperties } from '@transaction/lib/hive-api';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import { getWitnessesByVote } from '@/wallet/lib/hive';

const WITNESS_LIST_LIMIT = 250;
const TOP_WITNESSES_ALWAYS_LISTED = 101;
const LAST_BLOCK_AGE_THRESHOLD_IN_SEC = 2592000;
const BLOCK_INTERVAL_IN_SEC = 3;

export const WITNESS_LIST_QUERY_KEY = ['witnesses'] as const;

/** The witness fields the witness table shows. */
export type WitnessSummary = Pick<
  IWitness,
  | 'id'
  | 'owner'
  | 'votes'
  | 'url'
  | 'signing_key'
  | 'running_version'
  | 'created'
  | 'hbd_exchange_rate'
  | 'last_hbd_exchange_update'
  | 'last_confirmed_block_num'
>;

/** The witness fields of an owner's account profile. */
export interface WitnessProfile {
  witnessDescription?: string;
  witnessOwner?: string;
}

/** Plain JSON, so it can be prefetched on the server and hydrated on the client. */
export interface WitnessList {
  headBlock: number;
  totalVestingFundHive: GetDynamicGlobalPropertiesResponse['total_vesting_fund_hive'];
  totalVestingShares: GetDynamicGlobalPropertiesResponse['total_vesting_shares'];
  witnesses: WitnessSummary[];
  profiles: Record<string, WitnessProfile>;
}

const lastBlockAgeInSecs = (headBlock: number, witness: Pick<IWitness, 'last_confirmed_block_num'>) =>
  (headBlock - witness.last_confirmed_block_num) * BLOCK_INTERVAL_IN_SEC;

// The top witnesses are always listed, the others only while they still produce blocks.
const isListed = (headBlock: number, witness: Pick<IWitness, 'last_confirmed_block_num'>, index: number) =>
  index < TOP_WITNESSES_ALWAYS_LISTED || lastBlockAgeInSecs(headBlock, witness) <= LAST_BLOCK_AGE_THRESHOLD_IN_SEC;

const toWitnessSummary = (witness: IWitness): WitnessSummary => ({
  id: witness.id,
  owner: witness.owner,
  votes: witness.votes,
  url: witness.url,
  signing_key: witness.signing_key,
  running_version: witness.running_version,
  created: witness.created,
  hbd_exchange_rate: witness.hbd_exchange_rate,
  last_hbd_exchange_update: witness.last_hbd_exchange_update,
  last_confirmed_block_num: witness.last_confirmed_block_num
});

const getWitnessProfiles = async (owners: string[]): Promise<Record<string, WitnessProfile>> => {
  const accounts = await getAccounts(owners);
  return Object.fromEntries(
    accounts.map((account) => [
      account.name,
      { witnessDescription: account.profile?.witness_description, witnessOwner: account.profile?.witness_owner }
    ])
  );
};

/**
 * Fetches the witnesses by vote, the chain totals to value their votes, and the witness profiles
 * of the owners the table lists. Reads through the wasm-free read client, on the server and the client.
 */
export const getWitnessList = async (): Promise<WitnessList> => {
  const [dynamicGlobalProperties, witnesses] = await Promise.all([
    getDynamicGlobalProperties(),
    getWitnessesByVote(WITNESS_LIST_LIMIT)
  ]);
  const headBlock = dynamicGlobalProperties.head_block_number;
  const listedOwners = witnesses
    .filter((witness, i) => isListed(headBlock, witness, i))
    .map((witness) => witness.owner);
  return {
    headBlock,
    totalVestingFundHive: dynamicGlobalProperties.total_vesting_fund_hive,
    totalVestingShares: dynamicGlobalProperties.total_vesting_shares,
    witnesses: witnesses.map(toWitnessSummary),
    profiles: await getWitnessProfiles(listedOwners)
  };
};

/** A listed witness with its rank and the values the table derives from the chain totals. */
export type RankedWitness = WitnessSummary & {
  rank: number;
  vestsToHp: Big;
  requiredHpToRankUp: Big | null;
  witnessLastBlockAgeInSecs: number;
};

/** Ranks the witnesses by vote and keeps the ones the table lists. */
export const rankWitnesses = (list: WitnessList): RankedWitness[] => {
  const totalVesting = convertStringToBig(list.totalVestingFundHive);
  const totalShares = convertStringToBig(list.totalVestingShares);
  const votesToHp = (votes: string) => totalVesting.times(Big(votes).div(totalShares)).div(1000000);

  return list.witnesses
    .map((witness, i) => {
      const vestsToHp = votesToHp(witness.votes);
      const previous = list.witnesses[i - 1];
      const deltaHp = previous ? votesToHp(previous.votes).minus(vestsToHp) : Big(0);
      return {
        ...witness,
        rank: i + 1,
        vestsToHp,
        requiredHpToRankUp: deltaHp.gt(0) ? deltaHp : null,
        witnessLastBlockAgeInSecs: lastBlockAgeInSecs(list.headBlock, witness),
        url: witness.url.replace('steemit.com', 'hive.blog')
      };
    })
    .filter((witness, i) => isListed(list.headBlock, witness, i));
};
