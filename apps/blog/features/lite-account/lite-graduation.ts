import {
  graduate,
  l2Expiration,
  linkOp,
  relayL2,
  signL2Operations,
  type GraduationKeys,
  type L2Transaction,
  type LiteGraduateRequest,
  type LiteGraduated
} from '@hiveio/lite-account';
import { liteGatewayEndpoint } from './lite-endpoints.ts';
import { fetchLiteGraduation } from './lite-graduation-query.ts';
import type { StoredLiteIdentity } from './lite-identity-record.ts';

// Graduating a lite account to a Hive account: the signer derives the new account's keys from the
// passkey, the lite account signs `link` with its posting key, the gateway creates the account,
// delegates RC and relays the link; the link counts once the gateway's read names the account.

/** The signer's key roles (hive-passkey-signer numbering), as `getPublicKeys` returns them. */
export const GRADUATION_ROLES = { owner: 0, active: 1, memo: 3, posting: 4 } as const;
/** When to read the graduation again after the link was relayed: it lands a block or two later. */
const LINKED_POLL_MS = [2000, 3000, 4000, 6000, 8000, 12000, 15000];

/** A failed graduation step of this module's own: `signer_keys` (the signer left a role out). */
export class LiteGraduationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LiteGraduationError';
    this.code = code;
  }
}

/** What the flow shows: the signer's keys, the account's creation (and RC delegation), the link. */
export type GraduationStep = 'keys' | 'creating' | 'linking';

/** The gateway as the flow uses it; `liteGraduationGateway` through the app's pass-through. */
export type GraduationGateway = {
  graduate: (request: LiteGraduateRequest) => Promise<LiteGraduated>;
  relayLink: (tx: L2Transaction) => Promise<unknown>;
  linkedAccount: (name: string) => Promise<string | null>;
};

export const liteGraduationGateway: GraduationGateway = {
  graduate: (request) => graduate(liteGatewayEndpoint(), request),
  relayLink: (tx) => relayL2(liteGatewayEndpoint(), tx),
  linkedAccount: async (name) => (await fetchLiteGraduation(name)).linked_account
};

/** The relaying gateway's chain and lite_account app id. */
export type GraduationRelay = { chainId: string; accountApp: string };

type SignerKey = { role: number; publicKey: string };

/** The new account's keys out of the signer's `getPublicKeys` answer (account 0, all four roles). */
export function graduationKeys(keys: readonly SignerKey[]): GraduationKeys {
  const of = (role: keyof typeof GRADUATION_ROLES) => {
    const key = keys.find((item) => item.role === GRADUATION_ROLES[role])?.publicKey;
    if (!key) throw new LiteGraduationError('signer_keys', `the signer returned no ${role} key`);
    return key;
  };
  return { owner: of('owner'), active: of('active'), posting: of('posting'), memo: of('memo') };
}

/** The lite account's `link` to `account`, signed with this browser's posting key. */
export const signedLink = (identity: StoredLiteIdentity, account: string, relay: GraduationRelay): L2Transaction =>
  signL2Operations([linkOp(identity.name, account)], identity.postingWif, relay.accountApp, l2Expiration(), relay.chainId);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads the graduation until it names `account` as linked; false when it never does in time. */
async function waitUntilLinked(gateway: GraduationGateway, name: string, account: string, wait: typeof sleep) {
  for (const delay of LINKED_POLL_MS) {
    await wait(delay);
    const linked = await gateway.linkedAccount(name).catch(() => null);
    if (linked === account) return true;
  }
  return false;
}

export type GraduationParams = {
  identity: StoredLiteIdentity;
  /** The Hive account name to create. */
  account: string;
  /** The signer's `getPublicKeys` for the four roles of account 0. */
  readKeys: () => Promise<readonly SignerKey[]>;
  relay: GraduationRelay;
  onStep: (step: GraduationStep) => void;
  /** Called once the account exists, before the link is confirmed: the caller records it. */
  onCreated: (account: string, keys: GraduationKeys) => void;
  gateway?: GraduationGateway;
  wait?: typeof sleep;
};

/** How a graduation ended: the account exists; `linked` is false when the link must be retried. */
export type GraduationOutcome = { account: string; keys: GraduationKeys; linked: boolean };

/**
 * Graduates the lite account `identity` to the Hive account `account`. Rejects with the signer's
 * or the gateway's error when the account was not created (nothing has changed then); once it is,
 * resolves, with `linked` false when the gateway's link broadcast failed or never showed up.
 */
export async function graduateLiteAccount({
  identity,
  account,
  readKeys,
  relay,
  onStep,
  onCreated,
  gateway = liteGraduationGateway,
  wait = sleep
}: GraduationParams): Promise<GraduationOutcome> {
  onStep('keys');
  const keys = graduationKeys(await readKeys());
  const tx = signedLink(identity, account, relay);
  onStep('creating');
  const created = await gateway.graduate({ tx, keys });
  onCreated(created.account, keys);
  onStep('linking');
  const linked =
    created.link_trx_id !== null && (await waitUntilLinked(gateway, identity.name, created.account, wait));
  return { account: created.account, keys, linked };
}

export type RetryLinkParams = Pick<GraduationParams, 'identity' | 'account' | 'relay' | 'gateway' | 'wait'>;

/**
 * Relays the lite account's `link` to `account` again through `/l2`, signed afresh (the first one's
 * expiration may have passed). Resolves with whether the gateway's read shows it; rejects with the
 * gateway's refusal.
 */
export async function retryLiteLink({
  identity,
  account,
  relay,
  gateway = liteGraduationGateway,
  wait = sleep
}: RetryLinkParams): Promise<boolean> {
  await gateway.relayLink(signedLink(identity, account, relay));
  return waitUntilLinked(gateway, identity.name, account, wait);
}
