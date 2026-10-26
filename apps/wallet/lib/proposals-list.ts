const DAY_MS = 24 * 60 * 60 * 1000;

/** The `list_proposals` statuses the proposals page offers as tabs, in tab order. */
export const PROPOSAL_STATUS_TABS = ['all', 'active', 'inactive', 'expired', 'votable'] as const;
export type ProposalStatusTab = (typeof PROPOSAL_STATUS_TABS)[number];

export const isProposalStatusTab = (value: string): value is ProposalStatusTab =>
  PROPOSAL_STATUS_TABS.some((tab) => tab === value);

/** The translation key of each status's label, shared by the status tabs and the status select. */
export const PROPOSAL_STATUS_LABEL_KEYS: Record<ProposalStatusTab, string> = {
  all: 'select_sort.sort_proposals.all',
  active: 'select_sort.sort_proposals.active',
  inactive: 'select_sort.sort_proposals.upcoming',
  expired: 'select_sort.sort_proposals.expired',
  votable: 'select_sort.sort_proposals.votable'
};

/**
 * Whole days, rounded up, from `now` (ms since the epoch) to `endDate`, a Hive API timestamp (UTC
 * without a zone designator); 0 once it has passed.
 */
export const remainingDays = (endDate: string, now: number): number =>
  Math.max(0, Math.ceil((Date.parse(`${endDate}Z`) - now) / DAY_MS));

/** Whether the proposal's title, creator or receiver contains `query`, ignoring case and surrounding blanks. */
export const matchesProposalSearch = (
  proposal: { subject: string; creator: string; receiver: string },
  query: string
): boolean => {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [proposal.subject, proposal.creator, proposal.receiver].some((field) =>
    field.toLocaleLowerCase().includes(needle)
  );
};

/**
 * The proposals of every loaded page in order, each once: a `list_proposals` page starts at the
 * cursor it was given, so it can repeat the last proposal of the page before it.
 */
export const uniqueProposals = <T extends { proposal_id: number }>(pages: readonly (readonly T[])[]): T[] => {
  const seen = new Set<number>();
  return pages.flat().filter((proposal) => {
    if (seen.has(proposal.proposal_id)) return false;
    seen.add(proposal.proposal_id);
    return true;
  });
};

/**
 * The rest of a `list_proposals` listing, from the proposal with id `lastId` (from the start when
 * `undefined`) to its end, as the pages `fetchPage` returns. Each page starts at the cursor it is
 * given, the last proposal of the page before; one shorter than `limit` is the last.
 */
export async function fetchProposalPagesFrom<T extends { id: number }>(
  fetchPage: (lastId: number | undefined) => Promise<T[]>,
  lastId: number | undefined,
  limit: number
): Promise<T[][]> {
  const pages: T[][] = [];
  let cursor = lastId;
  for (;;) {
    const page = await fetchPage(cursor);
    pages.push(page);
    const next = page.at(-1)?.id;
    if (page.length < limit || next === undefined || next === cursor) return pages;
    cursor = next;
  }
}

/** Whether the proposal pays back into the DHF, the proposals the list marks "refund". */
export const isRefundProposal = (proposal: { receiver: string }, refundAccounts: readonly string[]): boolean =>
  refundAccounts.includes(proposal.receiver);

type FundedSet = Pick<ReadonlyMap<number, unknown>, 'has'>;

export type ProposalFundingBadge = 'funded' | 'not_funded';

export interface FundingMarks {
  /** Index of the proposal the funding line follows, or -1 for no line. */
  lineIndex: number;
  /** Each proposal's funding badge, if it shows one. */
  badges: (ProposalFundingBadge | undefined)[];
}

const lastFundedIndex = (proposals: readonly { proposal_id: number }[], funded: FundedSet): number => {
  for (let index = proposals.length - 1; index >= 0; index--) {
    if (funded.has(proposals[index].proposal_id)) return index;
  }
  return -1;
};

/**
 * How the list marks the next round of DHF payouts. `withLine` (a list in vote order) draws a line
 * after the last `funded` proposal, and badges "not funded" any proposal above it that is not;
 * otherwise, or when no listed proposal is funded, every active proposal gets a badge. A refund
 * proposal (receiver in `refundAccounts`) never gets one: what it is paid goes back to the DHF.
 */
export function fundingMarks(
  proposals: readonly { proposal_id: number; status: string; receiver: string }[],
  funded: FundedSet,
  withLine: boolean,
  refundAccounts: readonly string[]
): FundingMarks {
  const lineIndex = withLine ? lastFundedIndex(proposals, funded) : -1;
  const badges = proposals.map((proposal, index): ProposalFundingBadge | undefined => {
    if (isRefundProposal(proposal, refundAccounts)) return undefined;
    const isFunded = funded.has(proposal.proposal_id);
    if (lineIndex >= 0) return index < lineIndex && !isFunded ? 'not_funded' : undefined;
    if (proposal.status !== 'active') return undefined;
    return isFunded ? 'funded' : 'not_funded';
  });
  return { lineIndex, badges };
}
