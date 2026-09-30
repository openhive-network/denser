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
 */
export type LiteRelayConfig = {
  gateAccount: string;
  gatePostingWif: string;
  chainId: string;
  maxExpirationMinutes: number;
  maxBodyBytes: number;
};

const HEX64 = /^[0-9a-fA-F]{64}$/;

export function liteRelayConfig(): LiteRelayConfig | undefined {
  const gateAccount = process.env.DENSER_SERVER_LITE_GATE_ACCOUNT;
  const gatePostingWif = process.env.DENSER_SERVER_LITE_GATE_POSTING_WIF;
  if (!gateAccount || !gatePostingWif) return undefined;
  const chainId = process.env.DENSER_SERVER_LITE_CHAIN_ID ?? siteConfig.chainId;
  if (!HEX64.test(chainId)) {
    throw new Error('lite relay: chain id must be a 64-hex string (set DENSER_SERVER_LITE_CHAIN_ID)');
  }
  const maxExpirationMinutes = Number(process.env.DENSER_SERVER_LITE_MAX_EXPIRATION_MIN ?? '60');
  return { gateAccount, gatePostingWif, chainId, maxExpirationMinutes, maxBodyBytes: 64 * 1024 };
}
