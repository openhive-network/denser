import { DEFAULT_LITE_APP_IDS, type LiteAppIds } from '@hive/lite-account';
import { siteConfig } from '@ui/config/site';

/**
 * Relay (broadcaster) configuration — server-only. The gate account posts bridged
 * comments on L1 on behalf of lite accounts and pays their RC; its POSTING key is
 * all the relay ever needs (comment + custom_json are posting-auth ops).
 *
 *   DENSER_SERVER_LITE_GATE_ACCOUNT       the gate account name
 *   DENSER_SERVER_LITE_GATE_POSTING_WIF   its posting private key (WIF)
 *   DENSER_SERVER_LITE_CHAIN_ID           optional 64-hex chain id override (defaults to the site chain id)
 *   DENSER_SERVER_LITE_MAX_EXPIRATION_MIN optional max L2 expiration window accepted (default 60)
 *   DENSER_SERVER_LITE_ACCOUNT_APP        optional custom_json id of the lite_account app (default lite_account)
 *   DENSER_SERVER_LITE_POSTS_APP          optional custom_json id of the lite_posts app (default lite_posts);
 *                                         also the json_metadata key of the disavowal marker
 * Set the two app ids to a test namespace (e.g. lite_account_test / lite_posts_test) on
 * test deployments so the release apps never see, and never have to filter, test data.
 */
export type LiteRelayConfig = {
  gateAccount: string;
  gatePostingWif: string;
  chainId: string;
  apps: LiteAppIds;
  maxExpirationMinutes: number;
  maxBodyBytes: number;
};

const HEX64 = /^[0-9a-fA-F]{64}$/;
/** custom_json ids: 1..32 chars (HIVE_CUSTOM_OP_ID_MAX_LENGTH); keep them identifier-like. */
const APP_ID = /^[a-z0-9_-]{1,32}$/;

function appId(envName: string, fallback: string): string {
  const value = process.env[envName] ?? fallback;
  if (!APP_ID.test(value)) throw new Error(`lite relay: ${envName} must match ${APP_ID}`);
  return value;
}

export function liteRelayConfig(): LiteRelayConfig | undefined {
  const gateAccount = process.env.DENSER_SERVER_LITE_GATE_ACCOUNT;
  const gatePostingWif = process.env.DENSER_SERVER_LITE_GATE_POSTING_WIF;
  if (!gateAccount || !gatePostingWif) return undefined;
  const chainId = process.env.DENSER_SERVER_LITE_CHAIN_ID ?? siteConfig.chainId;
  if (!HEX64.test(chainId)) {
    throw new Error('lite relay: chain id must be a 64-hex string (set DENSER_SERVER_LITE_CHAIN_ID)');
  }
  const maxExpirationMinutes = Number(process.env.DENSER_SERVER_LITE_MAX_EXPIRATION_MIN ?? '60');
  const apps: LiteAppIds = {
    account: appId('DENSER_SERVER_LITE_ACCOUNT_APP', DEFAULT_LITE_APP_IDS.account),
    posts: appId('DENSER_SERVER_LITE_POSTS_APP', DEFAULT_LITE_APP_IDS.posts)
  };
  return { gateAccount, gatePostingWif, chainId, apps, maxExpirationMinutes, maxBodyBytes: 64 * 1024 };
}
