import env from '@beam-australia/react-env';

export type SidechainRewardSource = 'scot' | 'comments';
export type SidechainChainMode = 'hive' | 'steem';

export interface SidechainRewardsConfig {
  enabled: boolean;
  token: string;
  source: SidechainRewardSource | null;
  feedTag: string;
  customJsonId: string;
  scotApiBaseUrl: string;
  commentsRpcUrl: string;
  chainMode: SidechainChainMode;
  timeoutMs: number;
  textColor: string;
  logoUrl: string;
  logoAlt: string;
  debug: boolean;
}

export interface SidechainPostReward {
  token: string;
  amount: number;
  precision: number;
  status: 'pending' | 'paid';
  source: SidechainRewardSource;
  payoutAt: string;
}

export interface SidechainCuratorReward {
  voter: string;
  token: string;
  amount: number;
  precision: number;
  source: SidechainRewardSource;
}

export interface SidechainWalletReward {
  token: string;
  amount: number;
  liquidAmount: number;
  stakedAmount: number;
  delegationAmount: number;
  pendingAmount: number;
  pendingUnstakeAmount: number;
  unstakeCooldownDays: number;
  unstakeTransactions: number;
  precision: number;
  kind: 'pending' | 'balance';
  source: SidechainRewardSource;
}

export interface SidechainAccountTransaction {
  transactionId: string;
  blockNumber: number;
  timestamp: number;
  operation: string;
  from: string;
  to: string;
  symbol: string;
  quantity: string;
  memo: string;
  account: string;
}

interface JsonRpcFindResponse<T> {
  result?: T[];
}

interface ScotPostPayload {
  precision?: number;
  pending_token?: string | number;
  total_payout_value?: string | number;
  curator_payout_value?: string | number;
  beneficiaries_payout_value?: string | number;
  total_vote_weight?: string | number;
  vote_rshares?: string | number;
  cashout_time?: string;
  last_payout?: string;
  active_votes?: ScotVotePayload[];
}

interface ScotVotePayload {
  voter?: string;
  rshares?: string | number;
}

interface ScotConfigPayload {
  author_curve_exponent?: string | number;
  author_reward_percentage?: string | number;
}

interface ScotInfoPayload {
  precision?: string | number;
  reward_pool?: string | number;
  pending_rshares?: string | number;
}

interface ScotAccountPayload {
  precision?: number | string;
  pending_token?: number | string;
  earned_token?: number | string;
  staked_tokens?: number | string;
}

interface ScotMeta {
  precision: number;
  authorCurveExponent: number;
  authorRewardShare: number;
  rewardPool: number;
  pendingRshares: number;
}

interface CommentsPostPayload {
  totalPayoutValue?: string | number;
  curatorPayoutValue?: string | number;
  beneficiariesPayoutValue?: string | number;
  cashoutTime?: string | number;
  voteRshareSum?: string | number;
  app?: string;
  beneficiaries?: CommentsBeneficiaryPayload[];
}

interface CommentsTokenPayload {
  precision?: number;
}

interface CommentsBeneficiaryPayload {
  account?: string;
  weight?: string | number;
}

interface CommentsAppTaxConfigPayload {
  app?: string;
  percent?: string | number;
  beneficiary?: string;
}

interface CommentsRewardPoolConfigPayload {
  postRewardCurve?: string;
  postRewardCurveParameter?: string | number;
  curationRewardPercentage?: string | number;
  appTaxConfig?: CommentsAppTaxConfigPayload;
}

interface CommentsRewardPoolPayload {
  symbol?: string;
  intervalRewardPool?: string | number;
  intervalPendingClaims?: string | number;
  config?: CommentsRewardPoolConfigPayload;
}

interface CommentsBalancePayload {
  balance?: string;
  stake?: string;
}

interface CommentsDelegationPayload {
  quantity?: string | number;
}

interface CommentsPendingUnstakePayload {
  quantity?: string | number;
  pendingUnstake?: string | number;
  amount?: string | number;
  balance?: string | number;
}

interface TokenContractPayload {
  unstakingCooldown?: string | number;
  numberTransactions?: string | number;
}

interface CommentsVotePayload {
  voter?: string;
  account?: string;
  rshares?: string | number;
  curationWeight?: string | number;
}

const BOOLEAN_TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const INVALID_TOKEN_VALUES = new Set(['NULL', 'UNDEFINED', 'NONE', 'N/A', 'NA', 'FALSE', '0']);
const rewardPoolCache = new Map<string, boolean>();
const tokenPrecisionCache = new Map<string, number>();
const scotMetaCache = new Map<string, ScotMeta | null>();
const commentsRewardPoolMetaCache = new Map<string, CommentsRewardPoolPayload | null>();
const tokenContractMetaCache = new Map<string, { unstakeCooldownDays: number; unstakeTransactions: number }>();

const normalizeSource = (value: string): SidechainRewardSource | null => {
  if (value === 'scot' || value === 'comments') {
    return value;
  }
  return null;
};

const normalizeChainMode = (value: string): SidechainChainMode =>
  value.toLowerCase() === 'steem' ? 'steem' : 'hive';

const parseBoolean = (value: string) => BOOLEAN_TRUE_VALUES.has(value.toLowerCase());

const normalizeToken = (value: string): string => {
  const normalized = value.trim().toUpperCase();
  if (normalized.length === 0 || INVALID_TOKEN_VALUES.has(normalized)) {
    return '';
  }

  return /^[A-Z0-9.-]{1,32}$/.test(normalized) ? normalized : '';
};

const normalizeFeedTag = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  return /^[a-z0-9.-]{1,64}$/.test(normalized) ? normalized : '';
};

const asNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseDateMs = (value: unknown): number => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  if (typeof value === 'string') {
    const input = value.trim();
    if (!input) {
      return 0;
    }

    const numeric = Number(input);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
    }

    const ms = Date.parse(input);
    return Number.isFinite(ms) ? ms : 0;
  }

  return 0;
};

const normalizeBaseUrl = (value: string, fallback: string): string => {
  const input = value.trim();
  const base = input.length > 0 ? input : fallback;
  return base.replace(/\/+$/, '');
};

const withTimeout = async <T>(
  requestFactory: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await requestFactory(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

const fetchJson = async <T>(url: string, timeoutMs: number): Promise<T> =>
  withTimeout(
    async (signal) => {
      const response = await fetch(url, {
        signal,
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Request failed for ${url} (${response.status})`);
      }
      return (await response.json()) as T;
    },
    timeoutMs
  );

const getScotQuery = (token: string, chainMode: SidechainChainMode): string =>
  `token=${encodeURIComponent(token)}&hive=${chainMode === 'hive' ? '1' : '0'}`;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const calculateCommentsPostClaims = (
  voteRshareSum: number,
  rewardCurve: string | undefined,
  rewardCurveParameter: number
): number => {
  if (voteRshareSum <= 0) {
    return 0;
  }

  if (rewardCurve === 'power') {
    const exponent = rewardCurveParameter > 0 ? rewardCurveParameter : 1;
    return Math.pow(voteRshareSum, exponent);
  }

  return voteRshareSum;
};

const calculateCommentsBeneficiariesPayout = (
  authorBenePortion: number,
  beneficiaries: CommentsBeneficiaryPayload[] | undefined
): number => {
  if (!beneficiaries || beneficiaries.length === 0 || authorBenePortion <= 0) {
    return 0;
  }

  let total = 0;
  for (const beneficiary of beneficiaries) {
    const weight = clamp(asNumber(beneficiary.weight), 0, 10000);
    if (weight <= 0) {
      continue;
    }
    total += authorBenePortion * (weight / 10000);
  }

  return Math.min(total, authorBenePortion);
};

const getScotMeta = async (
  config: SidechainRewardsConfig
): Promise<ScotMeta | null> => {
  const key = `${config.scotApiBaseUrl}|${config.token}|${config.chainMode}`;
  if (scotMetaCache.has(key)) {
    return scotMetaCache.get(key) ?? null;
  }

  try {
    const query = getScotQuery(config.token, config.chainMode);
    const [cfg, info] = await Promise.all([
      fetchJson<ScotConfigPayload>(`${config.scotApiBaseUrl}/config?${query}`, config.timeoutMs),
      fetchJson<ScotInfoPayload>(`${config.scotApiBaseUrl}/info?${query}`, config.timeoutMs)
    ]);

    const precision = Math.max(0, asNumber(info?.precision));
    const authorCurveExponent = asNumber(cfg?.author_curve_exponent) || 1;
    const authorRewardShare = clamp(asNumber(cfg?.author_reward_percentage) / 100, 0, 1);
    const rewardPool = Math.max(0, asNumber(info?.reward_pool));
    const pendingRshares = Math.max(0, asNumber(info?.pending_rshares));

    const meta: ScotMeta = {
      precision,
      authorCurveExponent,
      authorRewardShare,
      rewardPool,
      pendingRshares
    };

    scotMetaCache.set(key, meta);
    return meta;
  } catch (_error) {
    return null;
  }
};

const getContractsUrl = (rpcUrl: string) => `${normalizeBaseUrl(rpcUrl, 'https://api.hive-engine.com/rpc')}/contracts`;

const rpcFind = async <T>(
  rpcUrl: string,
  params: Record<string, unknown>,
  timeoutMs: number
): Promise<T[]> => {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'find',
    params
  };

  const response = await withTimeout(
    async (signal) => {
      const result = await fetch(getContractsUrl(rpcUrl), {
        signal,
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!result.ok) {
        throw new Error(`RPC request failed (${result.status})`);
      }
      return (await result.json()) as JsonRpcFindResponse<T>;
    },
    timeoutMs
  );

  return Array.isArray(response.result) ? response.result : [];
};

const getTokenPrecision = async (
  token: string,
  rpcUrl: string,
  timeoutMs: number
): Promise<number> => {
  if (tokenPrecisionCache.has(token)) {
    return tokenPrecisionCache.get(token) ?? 3;
  }

  const tokenRows = await rpcFind<CommentsTokenPayload>(
    rpcUrl,
    {
      contract: 'tokens',
      table: 'tokens',
      query: { symbol: token },
      limit: 1,
      offset: 0
    },
    timeoutMs
  );

  const precision = tokenRows.length > 0 ? asNumber(tokenRows[0].precision) : 3;
  tokenPrecisionCache.set(token, precision);
  return precision;
};

const hasCommentsRewardPool = async (
  token: string,
  rpcUrl: string,
  timeoutMs: number
): Promise<boolean> => {
  if (rewardPoolCache.has(token)) {
    return rewardPoolCache.get(token) ?? false;
  }

  const pools = await rpcFind<{ symbol?: string }>(
    rpcUrl,
    {
      contract: 'comments',
      table: 'rewardPools',
      query: { symbol: token },
      limit: 1,
      offset: 0
    },
    timeoutMs
  );

  const exists = pools.length > 0;
  rewardPoolCache.set(token, exists);
  return exists;
};

const getCommentsRewardPoolMeta = async (
  token: string,
  rpcUrl: string,
  timeoutMs: number
): Promise<CommentsRewardPoolPayload | null> => {
  const key = `${normalizeBaseUrl(rpcUrl, 'https://api.hive-engine.com/rpc')}|${token}`;
  if (commentsRewardPoolMetaCache.has(key)) {
    return commentsRewardPoolMetaCache.get(key) ?? null;
  }

  const pools = await rpcFind<CommentsRewardPoolPayload>(
    rpcUrl,
    {
      contract: 'comments',
      table: 'rewardPools',
      query: { symbol: token },
      limit: 1,
      offset: 0
    },
    timeoutMs
  );

  const pool = pools.length > 0 ? pools[0] : null;
  commentsRewardPoolMetaCache.set(key, pool);
  rewardPoolCache.set(token, pool !== null);
  return pool;
};

const getTokenContractMeta = async (
  token: string,
  rpcUrl: string,
  timeoutMs: number
): Promise<{ unstakeCooldownDays: number; unstakeTransactions: number }> => {
  const key = `${normalizeBaseUrl(rpcUrl, 'https://api.hive-engine.com/rpc')}|${token}`;
  if (tokenContractMetaCache.has(key)) {
    return tokenContractMetaCache.get(key) ?? { unstakeCooldownDays: 0, unstakeTransactions: 0 };
  }

  const rows = await rpcFind<TokenContractPayload>(
    rpcUrl,
    {
      contract: 'tokens',
      table: 'tokens',
      query: { symbol: token },
      limit: 1,
      offset: 0
    },
    timeoutMs
  );

  const row = rows.length > 0 ? rows[0] : undefined;
  const meta = {
    unstakeCooldownDays: Math.max(0, asNumber(row?.unstakingCooldown)),
    unstakeTransactions: Math.max(0, asNumber(row?.numberTransactions))
  };
  tokenContractMetaCache.set(key, meta);
  return meta;
};

const getDelegationTotalForAccount = async (
  account: string,
  token: string,
  rpcUrl: string,
  timeoutMs: number
): Promise<number> => {
  const rows = await rpcFind<CommentsDelegationPayload>(
    rpcUrl,
    {
      contract: 'tokens',
      table: 'delegations',
      query: { from: account, symbol: token },
      limit: 1000,
      offset: 0
    },
    timeoutMs
  );

  let total = 0;
  for (const row of rows) {
    total += Math.max(0, asNumber(row?.quantity));
  }
  return total;
};

const getPendingUnstakeTotalForAccount = async (
  account: string,
  token: string,
  rpcUrl: string,
  timeoutMs: number
): Promise<number> => {
  const rows = await rpcFind<CommentsPendingUnstakePayload>(
    rpcUrl,
    {
      contract: 'tokens',
      table: 'pendingUnstakes',
      query: { account, symbol: token },
      limit: 1000,
      offset: 0
    },
    timeoutMs
  );

  let total = 0;
  for (const row of rows) {
    const amount = asNumber(row?.quantity ?? row?.pendingUnstake ?? row?.amount ?? row?.balance);
    total += Math.max(0, amount);
  }
  return total;
};

export const getSidechainRewardsConfig = (): SidechainRewardsConfig => {
  const enabled = parseBoolean((env('HE_REWARDS_ENABLED') ?? '').trim());
  const token = normalizeToken(env('HE_REWARDS_TOKEN') ?? '');
  const source = normalizeSource((env('HE_REWARDS_SOURCE') ?? '').trim().toLowerCase());
  const feedTag = normalizeFeedTag(env('HE_REWARDS_FEED_TAG') ?? env('HE_REWARDS_COMMUNITY_TAG') ?? '');

  const scotApiBaseUrl = normalizeBaseUrl(
    env('HE_SCOT_API_BASE_URL') ?? '',
    'https://scot-api.hive-engine.com'
  );
  const customJsonId = (env('HE_CUSTOM_JSON_ID') ?? '').trim() || 'ssc-mainnet-hive';
  const commentsRpcUrl = normalizeBaseUrl(
    env('HE_COMMENTS_RPC_URL') ?? '',
    'https://api.hive-engine.com/rpc'
  );

  const chainMode = normalizeChainMode((env('HE_CHAIN_MODE') ?? 'hive').trim());
  const parsedTimeout = Number.parseInt((env('HE_REWARDS_TIMEOUT_MS') ?? '').trim(), 10);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 8000;

  return {
    enabled,
    token,
    source,
    feedTag,
    customJsonId,
    scotApiBaseUrl,
    commentsRpcUrl,
    chainMode,
    timeoutMs,
    textColor: (env('HE_REWARDS_TEXT_COLOR') ?? '').trim(),
    logoUrl: (env('HE_REWARDS_LOGO_URL') ?? '').trim(),
    logoAlt: (env('HE_REWARDS_LOGO_ALT') ?? '').trim() || 'Token logo',
    debug: parseBoolean((env('HE_REWARDS_DEBUG') ?? '').trim())
  };
};

export const isSidechainRewardsConfigured = (
  config: SidechainRewardsConfig
): config is SidechainRewardsConfig & { source: SidechainRewardSource } =>
  config.enabled && config.token.length > 0 && !!config.source;

export const getSidechainRewardsFeedTag = (config: SidechainRewardsConfig): string => {
  if (!isSidechainRewardsConfigured(config)) {
    return '';
  }

  return config.feedTag || config.token.toLowerCase();
};

export const fetchSidechainPostReward = async (
  author: string,
  permlink: string,
  config: SidechainRewardsConfig
): Promise<SidechainPostReward | null> => {
  if (!isSidechainRewardsConfigured(config) || !author || !permlink) {
    return null;
  }

  try {
    if (config.source === 'scot') {
      const query = getScotQuery(config.token, config.chainMode);
      const url = `${config.scotApiBaseUrl}/@${author}/${permlink}?${query}`;

      const response = await fetchJson<Record<string, ScotPostPayload>>(url, config.timeoutMs);
      const payload = response?.[config.token];

      if (!payload) {
        return null;
      }

      const meta = await getScotMeta(config);
      const precision = meta?.precision ?? Math.max(0, asNumber(payload.precision));
      const pendingRaw = asNumber(payload.pending_token);
      const totalRaw = asNumber(payload.total_payout_value);
      const curatorRaw = asNumber(payload.curator_payout_value);
      const beneficiariesRaw = asNumber(payload.beneficiaries_payout_value);
      const totalVoteWeightRaw = Math.max(0, asNumber(payload.total_vote_weight));
      const voteRsharesRaw = Math.max(0, asNumber(payload.vote_rshares));
      const payoutAt = payload.cashout_time ?? '';
      const lastPayout = payload.last_payout ?? '';

      const cashoutMs = parseDateMs(payoutAt);
      const lastPayoutMs = parseDateMs(lastPayout);
      const cashoutActive =
        cashoutMs > Date.now() && (lastPayoutMs < cashoutMs || pendingRaw > 0);

      // Show the author-side payout so the sidechain amount mirrors the Hive payout semantics.
      const paidAuthorRaw = Math.max(totalRaw - curatorRaw - beneficiariesRaw, 0);

      let pendingAuthorRaw = pendingRaw;
      if (meta && meta.rewardPool > 0 && meta.pendingRshares > 0) {
        const sourceWeight = totalVoteWeightRaw > 0 ? totalVoteWeightRaw : voteRsharesRaw;
        if (sourceWeight > 0) {
          const totalPendingRaw =
            Math.pow(sourceWeight, meta.authorCurveExponent) * meta.rewardPool / meta.pendingRshares;
          pendingAuthorRaw = totalPendingRaw * meta.authorRewardShare;
        }
      }

      const selectedRaw = cashoutActive ? pendingAuthorRaw : paidAuthorRaw;
      const divisor = Math.pow(10, precision);
      const amount = divisor > 0 ? selectedRaw / divisor : selectedRaw;

      return {
        token: config.token,
        amount: amount >= 0 ? amount : 0,
        precision,
        status: cashoutActive ? 'pending' : 'paid',
        source: 'scot',
        payoutAt
      };
    }

    const rewardPoolMeta = await getCommentsRewardPoolMeta(
      config.token,
      config.commentsRpcUrl,
      config.timeoutMs
    );

    if (!rewardPoolMeta) {
      return null;
    }

    const authorperm = `@${author}/${permlink}`;
    const posts = await rpcFind<CommentsPostPayload>(
      config.commentsRpcUrl,
      {
        contract: 'comments',
        table: 'posts',
        query: { symbol: config.token, authorperm },
        limit: 1,
        offset: 0
      },
      config.timeoutMs
    );

    if (posts.length === 0) {
      return null;
    }

    const precision = await getTokenPrecision(config.token, config.commentsRpcUrl, config.timeoutMs);
    const post = posts[0];
    const payoutAtMs = parseDateMs(post.cashoutTime);
    const payoutAt = payoutAtMs > 0 ? new Date(payoutAtMs).toISOString() : '';
    const isPending = payoutAtMs > Date.now();
    const totalRaw = Math.max(0, asNumber(post.totalPayoutValue));
    const curatorRaw = Math.max(0, asNumber(post.curatorPayoutValue));
    const beneficiariesRaw = Math.max(0, asNumber(post.beneficiariesPayoutValue));
    const paidAuthorAmount = Math.max(totalRaw - curatorRaw - beneficiariesRaw, 0);

    let pendingAuthorAmount = 0;
    if (isPending) {
      const intervalRewardPool = Math.max(0, asNumber(rewardPoolMeta.intervalRewardPool));
      const intervalPendingClaims = Math.max(0, asNumber(rewardPoolMeta.intervalPendingClaims));
      const voteRshareSum = Math.max(0, asNumber(post.voteRshareSum));
      const rewardCurve = rewardPoolMeta.config?.postRewardCurve;
      const rewardCurveParameter = asNumber(rewardPoolMeta.config?.postRewardCurveParameter) || 1;
      const postClaims = calculateCommentsPostClaims(voteRshareSum, rewardCurve, rewardCurveParameter);

      const totalPendingAmount =
        intervalPendingClaims > 0 ? intervalRewardPool * (postClaims / intervalPendingClaims) : 0;

      const curationShare = clamp(
        asNumber(rewardPoolMeta.config?.curationRewardPercentage) / 100,
        0,
        1
      );
      const curatorPendingAmount = totalPendingAmount * curationShare;
      let authorBenePendingAmount = Math.max(totalPendingAmount - curatorPendingAmount, 0);

      const appTaxConfig = rewardPoolMeta.config?.appTaxConfig;
      const appTaxPercent = clamp(asNumber(appTaxConfig?.percent), 0, 100);
      const appName = (appTaxConfig?.app ?? '').trim().toLowerCase();
      const postApp = (post.app ?? '').trim().toLowerCase();
      if (appName && appTaxPercent > 0 && appName !== postApp) {
        authorBenePendingAmount -= authorBenePendingAmount * (appTaxPercent / 100);
      }
      authorBenePendingAmount = Math.max(authorBenePendingAmount, 0);

      const beneficiariesPendingAmount = calculateCommentsBeneficiariesPayout(
        authorBenePendingAmount,
        post.beneficiaries
      );
      pendingAuthorAmount = Math.max(authorBenePendingAmount - beneficiariesPendingAmount, 0);
    }

    const amount = isPending ? pendingAuthorAmount : paidAuthorAmount;

    return {
      token: config.token,
      amount,
      precision,
      status: isPending ? 'pending' : 'paid',
      source: 'comments',
      payoutAt
    };
  } catch (_error) {
    return null;
  }
};

export const fetchSidechainCuratorRewards = async (
  author: string,
  permlink: string,
  config: SidechainRewardsConfig
): Promise<SidechainCuratorReward[]> => {
  if (!isSidechainRewardsConfigured(config) || !author || !permlink) {
    return [];
  }

  try {
    if (config.source === 'scot') {
      const query = getScotQuery(config.token, config.chainMode);
      const url = `${config.scotApiBaseUrl}/@${author}/${permlink}?${query}`;
      const response = await fetchJson<Record<string, ScotPostPayload>>(url, config.timeoutMs);
      const payload = response?.[config.token];

      if (!payload) {
        return [];
      }

      const meta = await getScotMeta(config);
      const precision = meta?.precision ?? Math.max(0, asNumber(payload.precision));
      const divisor = Math.pow(10, precision);
      const pendingRaw = asNumber(payload.pending_token);
      const totalRaw = asNumber(payload.total_payout_value);
      const curatorRaw = Math.max(0, asNumber(payload.curator_payout_value));
      const totalVoteWeightRaw = Math.max(0, asNumber(payload.total_vote_weight));
      const voteRsharesRaw = Math.max(0, asNumber(payload.vote_rshares));
      const payoutAt = payload.cashout_time ?? '';
      const lastPayout = payload.last_payout ?? '';
      const cashoutMs = parseDateMs(payoutAt);
      const lastPayoutMs = parseDateMs(lastPayout);
      const cashoutActive =
        cashoutMs > Date.now() && (lastPayoutMs < cashoutMs || pendingRaw > 0);

      let curatorPoolRaw = curatorRaw;

      if (cashoutActive) {
        if (meta && meta.rewardPool > 0 && meta.pendingRshares > 0) {
          const sourceWeight = totalVoteWeightRaw > 0 ? totalVoteWeightRaw : voteRsharesRaw;
          if (sourceWeight > 0) {
            const totalPendingRaw =
              Math.pow(sourceWeight, meta.authorCurveExponent) * meta.rewardPool / meta.pendingRshares;
            curatorPoolRaw = totalPendingRaw * Math.max(1 - meta.authorRewardShare, 0);
          } else {
            curatorPoolRaw = 0;
          }
        } else {
          curatorPoolRaw = 0;
        }
      } else if (curatorPoolRaw <= 0 && totalRaw <= 0) {
        curatorPoolRaw = 0;
      }

      const validVotes = (Array.isArray(payload.active_votes) ? payload.active_votes : [])
        .map((vote) => ({
          voter: typeof vote.voter === 'string' ? vote.voter.trim() : '',
          rshares: Math.max(0, asNumber(vote.rshares))
        }))
        .filter((vote) => vote.voter.length > 0 && vote.rshares > 0);

      if (validVotes.length === 0) {
        return [];
      }

      const totalPositiveRshares = validVotes.reduce((sum, vote) => sum + vote.rshares, 0);
      if (totalPositiveRshares <= 0 || curatorPoolRaw <= 0) {
        return validVotes.map((vote) => ({
          voter: vote.voter,
          token: config.token,
          amount: 0,
          precision,
          source: 'scot'
        }));
      }

      const aggregated = new Map<string, { voter: string; rawAmount: number }>();
      for (const vote of validVotes) {
        const key = vote.voter.toLowerCase();
        const rawAmount = curatorPoolRaw * (vote.rshares / totalPositiveRshares);
        const existing = aggregated.get(key);
        if (existing) {
          existing.rawAmount += rawAmount;
        } else {
          aggregated.set(key, { voter: vote.voter, rawAmount });
        }
      }

      return Array.from(aggregated.values())
        .map((entry) => {
          const amount = divisor > 0 ? entry.rawAmount / divisor : entry.rawAmount;
          return {
            voter: entry.voter,
            token: config.token,
            amount: amount >= 0 ? amount : 0,
            precision,
            source: 'scot' as const
          };
        })
        .sort((a, b) => b.amount - a.amount);
    }

    const rewardPoolMeta = await getCommentsRewardPoolMeta(
      config.token,
      config.commentsRpcUrl,
      config.timeoutMs
    );
    if (!rewardPoolMeta) {
      return [];
    }

    const authorperm = `@${author}/${permlink}`;
    const posts = await rpcFind<CommentsPostPayload>(
      config.commentsRpcUrl,
      {
        contract: 'comments',
        table: 'posts',
        query: { symbol: config.token, authorperm },
        limit: 1,
        offset: 0
      },
      config.timeoutMs
    );

    if (posts.length === 0) {
      return [];
    }

    const precision = await getTokenPrecision(config.token, config.commentsRpcUrl, config.timeoutMs);
    const post = posts[0];
    const payoutAtMs = parseDateMs(post.cashoutTime);
    const isPending = payoutAtMs > Date.now();
    let curatorPoolAmount = Math.max(0, asNumber(post.curatorPayoutValue));

    if (isPending) {
      const intervalRewardPool = Math.max(0, asNumber(rewardPoolMeta.intervalRewardPool));
      const intervalPendingClaims = Math.max(0, asNumber(rewardPoolMeta.intervalPendingClaims));
      const voteRshareSum = Math.max(0, asNumber(post.voteRshareSum));
      const rewardCurve = rewardPoolMeta.config?.postRewardCurve;
      const rewardCurveParameter = asNumber(rewardPoolMeta.config?.postRewardCurveParameter) || 1;
      const postClaims = calculateCommentsPostClaims(voteRshareSum, rewardCurve, rewardCurveParameter);
      const totalPendingAmount =
        intervalPendingClaims > 0 ? intervalRewardPool * (postClaims / intervalPendingClaims) : 0;
      const curationShare = clamp(
        asNumber(rewardPoolMeta.config?.curationRewardPercentage) / 100,
        0,
        1
      );
      curatorPoolAmount = Math.max(totalPendingAmount * curationShare, 0);
    }

    let offset = 0;
    const limit = 1000;
    const allVotes: CommentsVotePayload[] = [];
    while (true) {
      const page = await rpcFind<CommentsVotePayload>(
        config.commentsRpcUrl,
        {
          contract: 'comments',
          table: 'votes',
          query: { symbol: config.token, authorperm },
          limit,
          offset
        },
        config.timeoutMs
      );
      if (page.length === 0) {
        break;
      }
      allVotes.push(...page);
      if (page.length < limit) {
        break;
      }
      offset += limit;
      if (offset >= 5000) {
        break;
      }
    }

    const validVotes = allVotes
      .map((vote) => {
        const voter =
          typeof vote.voter === 'string'
            ? vote.voter.trim()
            : typeof vote.account === 'string'
              ? vote.account.trim()
              : '';
        const curationWeight = Math.max(0, asNumber(vote.curationWeight));
        const rshares = Math.max(0, asNumber(vote.rshares));
        const weight = curationWeight > 0 ? curationWeight : rshares;
        return { voter, weight };
      })
      .filter((vote) => vote.voter.length > 0 && vote.weight > 0);

    if (validVotes.length === 0) {
      return [];
    }

    const totalWeight = validVotes.reduce((sum, vote) => sum + vote.weight, 0);
    if (totalWeight <= 0 || curatorPoolAmount <= 0) {
      return validVotes.map((vote) => ({
        voter: vote.voter,
        token: config.token,
        amount: 0,
        precision,
        source: 'comments'
      }));
    }

    const aggregated = new Map<string, { voter: string; amount: number }>();
    for (const vote of validVotes) {
      const key = vote.voter.toLowerCase();
      const amount = curatorPoolAmount * (vote.weight / totalWeight);
      const existing = aggregated.get(key);
      if (existing) {
        existing.amount += amount;
      } else {
        aggregated.set(key, { voter: vote.voter, amount });
      }
    }

    return Array.from(aggregated.values())
      .map((entry) => ({
        voter: entry.voter,
        token: config.token,
        amount: entry.amount >= 0 ? entry.amount : 0,
        precision,
        source: 'comments' as const
      }))
      .sort((a, b) => b.amount - a.amount);
  } catch (_error) {
    return [];
  }
};

export const fetchSidechainWalletReward = async (
  account: string,
  config: SidechainRewardsConfig
): Promise<SidechainWalletReward | null> => {
  const normalizedAccount = account.trim().toLowerCase();

  if (!isSidechainRewardsConfigured(config) || !normalizedAccount) {
    return null;
  }

  try {
    const [delegationAmount, tokenContractMeta, pendingUnstakeAmount] = await Promise.all([
      getDelegationTotalForAccount(
        normalizedAccount,
        config.token,
        config.commentsRpcUrl,
        config.timeoutMs
      ).catch(() => 0),
      getTokenContractMeta(config.token, config.commentsRpcUrl, config.timeoutMs).catch(() => ({
        unstakeCooldownDays: 0,
        unstakeTransactions: 0
      })),
      getPendingUnstakeTotalForAccount(
        normalizedAccount,
        config.token,
        config.commentsRpcUrl,
        config.timeoutMs
      ).catch(() => 0)
    ]);

    if (config.source === 'scot') {
      const query = getScotQuery(config.token, config.chainMode);
      const url = `${config.scotApiBaseUrl}/@${normalizedAccount}?${query}`;

      const response = await fetchJson<Record<string, ScotAccountPayload>>(
        url,
        config.timeoutMs
      );
      const payload = response?.[config.token];

      const meta = await getScotMeta(config);
      const precision = meta?.precision ?? Math.max(0, asNumber(payload?.precision));
      const pendingRaw = Math.max(0, asNumber(payload?.pending_token));
      const divisor = Math.pow(10, precision);
      const pendingAmount = divisor > 0 ? pendingRaw / divisor : pendingRaw;

      // Prefer per-account Hive-Engine token balances for liquid/staked amounts.
      const balanceRows = await rpcFind<CommentsBalancePayload>(
        config.commentsRpcUrl,
        {
          contract: 'tokens',
          table: 'balances',
          query: { account: normalizedAccount, symbol: config.token },
          limit: 1,
          offset: 0
        },
        config.timeoutMs
      );
      const tokenBalance = balanceRows.length > 0 ? balanceRows[0] : undefined;

      let liquidAmount = Math.max(0, asNumber(tokenBalance?.balance));
      let stakedAmount = Math.max(0, asNumber(tokenBalance?.stake));

      if (liquidAmount === 0 && stakedAmount === 0 && payload) {
        const liquidRaw = Math.max(0, asNumber(payload.earned_token));
        const stakedRaw = Math.max(0, asNumber(payload.staked_tokens));
        liquidAmount = divisor > 0 ? liquidRaw / divisor : liquidRaw;
        stakedAmount = divisor > 0 ? stakedRaw / divisor : stakedRaw;
      }

      return {
        token: config.token,
        amount: pendingAmount >= 0 ? pendingAmount : 0,
        liquidAmount: liquidAmount >= 0 ? liquidAmount : 0,
        stakedAmount: stakedAmount >= 0 ? stakedAmount : 0,
        delegationAmount: delegationAmount >= 0 ? delegationAmount : 0,
        pendingAmount: pendingAmount >= 0 ? pendingAmount : 0,
        pendingUnstakeAmount: pendingUnstakeAmount >= 0 ? pendingUnstakeAmount : 0,
        unstakeCooldownDays: tokenContractMeta.unstakeCooldownDays,
        unstakeTransactions: tokenContractMeta.unstakeTransactions,
        precision,
        kind: 'pending',
        source: 'scot'
      };
    }

    const rewardPoolExists = await hasCommentsRewardPool(
      config.token,
      config.commentsRpcUrl,
      config.timeoutMs
    );

    if (!rewardPoolExists) {
      return null;
    }

    const balanceRows = await rpcFind<CommentsBalancePayload>(
      config.commentsRpcUrl,
      {
        contract: 'tokens',
        table: 'balances',
        query: { account: normalizedAccount, symbol: config.token },
        limit: 1,
        offset: 0
      },
      config.timeoutMs
    );

    const precision = await getTokenPrecision(config.token, config.commentsRpcUrl, config.timeoutMs);
    const balance = balanceRows.length > 0 ? balanceRows[0] : undefined;
    const liquidAmount = Math.max(0, asNumber(balance?.balance));
    const stakedAmount = Math.max(0, asNumber(balance?.stake));
    const amount = liquidAmount + stakedAmount;

    return {
      token: config.token,
      amount: amount >= 0 ? amount : 0,
      liquidAmount,
      stakedAmount,
      delegationAmount: delegationAmount >= 0 ? delegationAmount : 0,
      pendingAmount: 0,
      pendingUnstakeAmount: pendingUnstakeAmount >= 0 ? pendingUnstakeAmount : 0,
      unstakeCooldownDays: tokenContractMeta.unstakeCooldownDays,
      unstakeTransactions: tokenContractMeta.unstakeTransactions,
      precision,
      kind: 'balance',
      source: 'comments'
    };
  } catch (_error) {
    return null;
  }
};

export const fetchSidechainAccountTransactions = async (
  account: string,
  config: SidechainRewardsConfig,
  limit = 500
): Promise<SidechainAccountTransaction[]> => {
  const normalizedAccount = account.trim().toLowerCase();

  if (!isSidechainRewardsConfigured(config) || !normalizedAccount) {
    return [];
  }

  try {
    const sanitizedLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 1000) : 500;
    const baseUrl = normalizeBaseUrl(
      env('HE_HISTORY_API_BASE_URL') ?? '',
      'https://history.hive-engine.com'
    );
    const query = new URLSearchParams({
      account: normalizedAccount,
      symbol: config.token,
      limit: String(sanitizedLimit)
    });
    const url = `${baseUrl}/accountHistory?${query.toString()}`;
    const rows = await fetchJson<Array<Record<string, unknown>>>(url, config.timeoutMs);

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows
      .map((row) => {
        const timestampMs = parseDateMs(row.timestamp);
        return {
          transactionId: String(row.transactionId ?? ''),
          blockNumber: Math.max(0, asNumber(row.blockNumber)),
          timestamp: timestampMs > 0 ? timestampMs : 0,
          operation: String(row.operation ?? ''),
          from: String(row.from ?? ''),
          to: String(row.to ?? ''),
          symbol: String(row.symbol ?? config.token),
          quantity: String(row.quantity ?? ''),
          memo: row.memo == null ? '' : String(row.memo),
          account: String(row.account ?? normalizedAccount)
        };
      })
      .filter((row) => row.transactionId.length > 0 && row.operation.length > 0 && row.timestamp > 0)
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (_error) {
    return [];
  }
};
