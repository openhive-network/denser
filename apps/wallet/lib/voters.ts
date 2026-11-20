import Big from 'big.js';
import { formatPercent } from '@ui/lib/locale-format';
import type { HafbeWitnessVoter, HafbeWitnessVoters } from '@hive/common-hiveio-packages/wax';

/**
 * The model of the voters dialog shared by proposals and witnesses: voters with their own and
 * proxied weight in HP, their share of the total, the breakdown bar's segments, and the paging of
 * a witness's voters (block explorer's hafbe-api, else `database_api.list_witness_votes`).
 */

/** Rows the dialog adds at a time, and the page size of the sources that page. */
export const VOTERS_PAGE_SIZE = 100;

/** Voters the breakdown bar shows apart at most; the rest share one segment. */
const MAX_BAR_SEGMENTS = 6;
/** Share below which a voter joins the rest in the breakdown bar. */
const MIN_BAR_SEGMENT_SHARE = 0.01;

const VESTS_PRECISION = 6;

/**
 * One voter: own and proxied weight in HP, or no weight when the source lists names only or when
 * the voter set a proxy (`proxy`), which the chain counts the vote of instead.
 */
export interface Voter {
  name: string;
  weight: { ownHp: number; proxyHp: number } | null;
  proxy?: string;
}

/** The chain's totals a VESTS amount is valued at: HIVE in the vesting fund and VESTS issued, as decimal amounts. */
export interface VestingTotals {
  vestingFundHive: Big;
  vestingShares: Big;
}

/** HP that `vests` VESTS satoshis are worth at `totals`. */
export const vestsToHp = (vests: string | number, totals: VestingTotals): number => {
  if (totals.vestingShares.lte(0)) return 0;
  return Number(
    totals.vestingFundHive.times(Big(vests).div(Big(10).pow(VESTS_PRECISION))).div(totals.vestingShares)
  );
};

/** A voter's whole weight in HP, own and proxied; 0 for one without a weight. */
export const voterHp = (voter: Voter): number => (voter.weight ? voter.weight.ownHp + voter.weight.proxyHp : 0);

/** `voters` by whole weight, largest first, voters via a proxy last, then by name. */
export const sortByWeight = (voters: readonly Voter[]): Voter[] =>
  [...voters].sort(
    (a, b) => Number(!!a.proxy) - Number(!!b.proxy) || voterHp(b) - voterHp(a) || a.name.localeCompare(b.name)
  );

/** The sum of the voters' whole weights in HP. */
export const totalHpOf = (voters: readonly Voter[]): number => voters.reduce((sum, voter) => sum + voterHp(voter), 0);

/** The part of `totalHp` that `hp` is, from 0 to 1; 0 when there is no total. */
export const shareOf = (hp: number, totalHp: number): number =>
  totalHp > 0 ? Math.min(1, Math.max(0, hp / totalHp)) : 0;

// The smallest share a percentage with one decimal shows.
const SMALLEST_SHOWN_PERCENT = 0.1;

/** A share as a percentage with one decimal in `locale`, e.g. "42.2%"; a share too small to show is "<0.1%". */
export const formatShare = (share: number, locale: string): string => {
  if (share > 0 && share < 0.0005) return `<${formatPercent(SMALLEST_SHOWN_PERCENT, locale, 1)}`;
  return formatPercent(share * 100, locale, 1);
};

export interface BarSegment {
  name: string;
  share: number;
}

/** The breakdown bar: the largest voters apart, the rest (`count` voters) as one segment. */
export interface Breakdown {
  segments: BarSegment[];
  rest: { count: number; share: number } | null;
}

/**
 * The breakdown bar of `voters` (sorted largest first, the largest ones at least) out of
 * `voterCount` voters with `totalHp` in all: up to MAX_BAR_SEGMENTS voters holding at least
 * MIN_BAR_SEGMENT_SHARE each apart, and everyone else as the rest.
 */
export const breakdownOf = (voters: readonly Voter[], totalHp: number, voterCount: number): Breakdown => {
  const segments: BarSegment[] = [];
  for (const voter of voters) {
    const share = shareOf(voterHp(voter), totalHp);
    if (segments.length === MAX_BAR_SEGMENTS || share < MIN_BAR_SEGMENT_SHARE) break;
    segments.push({ name: voter.name, share });
  }
  const restShare = Math.max(0, 1 - segments.reduce((sum, segment) => sum + segment.share, 0));
  const restCount = Math.max(0, voterCount - segments.length);
  return { segments, rest: restCount > 0 && restShare > 0 ? { count: restCount, share: restShare } : null };
};

/** The voters whose name contains `query`, case-insensitively; all of them for an empty query. */
export const filterByName = (voters: readonly Voter[], query: string): Voter[] => {
  const needle = query.trim().replace(/^@/, '').toLowerCase();
  if (!needle) return [...voters];
  return voters.filter((voter) => voter.name.includes(needle));
};

/** What may be a whole Hive account name, which hafbe-api's `voter-name` matches exactly. */
export const asAccountName = (query: string): string | null => {
  const name = query.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z][a-z0-9.-]{2,15}$/.test(name) ? name : null;
};

/** The reads a witness's voters come from. */
export interface WitnessVotersReads {
  /** hafbe-api's voters of `witness` by weight: page `page` (from 1), or the one voter named `voterName`. */
  hafbeVoters: (witness: string, page: number, pageSize: number, voterName?: string) => Promise<HafbeWitnessVoters>;
  /** Names of the voters of `witness` in name order from `from` on, `from` included, at most `limit`. */
  voterNamesFrom: (witness: string, from: string, limit: number) => Promise<string[]>;
  vestsToHp: (vests: string) => number;
  /** Told why the voters are listed by name only. */
  onHafbeUnavailable: (error: unknown) => void;
}

/** Where the next page of a witness's voters starts: a hafbe-api page, or after a name in name order. */
export type WitnessVotersCursor = { source: 'hafbe'; page: number } | { source: 'names'; after: string };

export const FIRST_WITNESS_VOTERS_PAGE: WitnessVotersCursor = { source: 'hafbe', page: 1 };

export interface WitnessVotersPage {
  voters: Voter[];
  /** Whether the voters carry weights (hafbe-api) or names only (the fallback). */
  weighted: boolean;
  /** All the witness's voters, when the source tells. */
  voterCount: number | null;
  next: WitnessVotersCursor | null;
}

const fromHafbe = (voter: HafbeWitnessVoter, reads: WitnessVotersReads): Voter => ({
  name: voter.voter_name,
  weight: { ownHp: reads.vestsToHp(voter.account_vests), proxyHp: reads.vestsToHp(voter.proxied_vests) }
});

const namesPage = async (
  reads: WitnessVotersReads,
  witness: string,
  after: string
): Promise<WitnessVotersPage> => {
  // The listing starts at `after` itself, which the previous page ended with.
  const limit = VOTERS_PAGE_SIZE + (after ? 1 : 0);
  const names = await reads.voterNamesFrom(witness, after, limit);
  const voters = names.filter((name) => name !== after).map((name): Voter => ({ name, weight: null }));
  const last = names.at(-1);
  return {
    voters,
    weighted: false,
    voterCount: null,
    next: names.length === limit && last ? { source: 'names', after: last } : null
  };
};

/**
 * The page of `witness`'s voters at `cursor`. hafbe-api's pages carry weights; when hafbe-api
 * cannot serve the first page (no node serves it, or it fails), the voters are listed by name from
 * `database_api.list_witness_votes` instead. A later hafbe-api page that fails throws: the list
 * already loaded is by weight, which names cannot continue.
 */
export const fetchWitnessVotersPage = async (
  reads: WitnessVotersReads,
  witness: string,
  cursor: WitnessVotersCursor
): Promise<WitnessVotersPage> => {
  if (cursor.source === 'names') return namesPage(reads, witness, cursor.after);
  let page: HafbeWitnessVoters;
  try {
    page = await reads.hafbeVoters(witness, cursor.page, VOTERS_PAGE_SIZE);
  } catch (error) {
    if (cursor.page > 1) throw error;
    reads.onHafbeUnavailable(error);
    return namesPage(reads, witness, '');
  }
  return {
    voters: page.voters.map((voter) => fromHafbe(voter, reads)),
    weighted: true,
    voterCount: page.total_votes,
    next: cursor.page < page.total_pages ? { source: 'hafbe', page: cursor.page + 1 } : null
  };
};

/** hafbe-api's voter of `witness` named exactly `query`, if the query is an account name voting for it. */
export const findWitnessVoter = async (
  reads: WitnessVotersReads,
  witness: string,
  query: string
): Promise<Voter[]> => {
  const name = asAccountName(query);
  if (!name) return [];
  const page = await reads.hafbeVoters(witness, 1, 1, name);
  return page.voters.map((voter) => fromHafbe(voter, reads));
};

/** What an account's governance vote weight is made of, in VESTS satoshis; `proxy` is '' for none. */
export interface GovernanceAccount {
  name: string;
  ownVests: string;
  /** The part of `ownVests` powered up too recently to count for governance yet. */
  delayedVests: string;
  proxiedVests: string;
  proxy: string;
}

/** The reads a proposal's voters come from. */
export interface ProposalVotersReads {
  /** Names of the voters of `proposalId` in name order from `from` on, `from` included, at most `limit`. */
  voterNamesFrom: (proposalId: number, from: string, limit: number) => Promise<string[]>;
  weightsOf: (names: string[]) => Promise<GovernanceAccount[]>;
  vestsToHp: (vests: string) => number;
}

/** `database_api.list_proposal_votes`' and `find_accounts`' limit per call. */
export const PROPOSAL_VOTES_BATCH_SIZE = 1000;

/**
 * A proposal voter weighed as the chain counts a proposal's `total_votes`: a voter who set a proxy
 * counts nothing (the proxy carries the weight), anyone else their own VESTS not delayed after a
 * power-up and every level of VESTS proxied to them.
 */
const proposalVoterOf = (account: GovernanceAccount, toHp: (vests: string) => number): Voter => {
  if (account.proxy) return { name: account.name, weight: null, proxy: account.proxy };
  const directVests = BigInt(account.ownVests) - BigInt(account.delayedVests);
  return {
    name: account.name,
    weight: {
      ownHp: toHp((directVests > BigInt(0) ? directVests : BigInt(0)).toString()),
      proxyHp: toHp(account.proxiedVests)
    }
  };
};

/**
 * Every voter of `proposalId` with their weight, by weight, largest first, voters via a proxy last.
 * The node lists a proposal's votes by voter name only, without weights, so ranking them needs them
 * all: the votes are read in batches of PROPOSAL_VOTES_BATCH_SIZE, then the voters' accounts.
 */
export const fetchProposalVoters = async (reads: ProposalVotersReads, proposalId: number): Promise<Voter[]> => {
  const names: string[] = [];
  let from = '';
  for (;;) {
    const batch = await reads.voterNamesFrom(proposalId, from, PROPOSAL_VOTES_BATCH_SIZE);
    names.push(...batch.filter((name) => name !== from));
    const last = batch.at(-1);
    if (batch.length < PROPOSAL_VOTES_BATCH_SIZE || !last || last === from) break;
    from = last;
  }
  const batches: string[][] = [];
  for (let i = 0; i < names.length; i += PROPOSAL_VOTES_BATCH_SIZE) {
    batches.push(names.slice(i, i + PROPOSAL_VOTES_BATCH_SIZE));
  }
  const accounts = (await Promise.all(batches.map((batch) => reads.weightsOf(batch)))).flat();
  return sortByWeight(accounts.map((account) => proposalVoterOf(account, reads.vestsToHp)));
};
