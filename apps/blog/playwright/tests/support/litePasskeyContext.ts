import { expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Shared mocks of the lite passkey specs (`liteIdentityPasskey.spec.ts`): the gateway's authority
 * read and `/l2` relay answered in the browser from one in-memory authority that the relayed
 * `update_authority` ops edit, a signer popup speaking the hive-passkey-signer protocol ("1"),
 * and the deployment's signer list.
 */

export const SIGNER = 'https://signer.syncad.com';
export const OTHER_SIGNER = 'https://signer.hive.blog';
export const ACCOUNT_APP = 'lite_account_test';
export const CHAIN_ID = 'beeab0de00000000000000000000000000000000000000000000000000000000';
/** The passkey root the stub signer derives (owner role, account 0). */
export const ROOT_KEY = 'STM6LLegbAgLAy28EHrffBVuANFWcFgmqRMW13wBmTExqFE9SCkg4';
/** A key of another device of the account; nothing signs with it here. */
export const OTHER_DEVICE_KEY = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ghm2D6b2gUMUddLUMBDx7ZZ';
/**
 * The keys the stub signer derives at account 0, by its role numbering (owner 0, active 1, memo 3,
 * posting 4): the root for owner, throwaway keys for the others.
 */
export const SIGNER_KEYS: Record<number, string> = {
  0: ROOT_KEY,
  1: 'STM6XSxumfZgvPSgmqi8PTBDPrwow34cn5LPkN7eZb12Zo4zXk8gW',
  3: 'STM7BcAppgjpAD1ukDRj3qnHn4dtE1f1sYSXAeVVn8facLy4HDtjo',
  4: 'STM67vr8aQPGrnXbeKNcMFSbLJBXWpTNbKJGhDEL7xRA1tRsKBtvV'
};
/** What the stub signer reports answered its ceremonies, unless a spec says otherwise. */
export const YUBIKEY = {
  attachment: 'cross-platform',
  transports: ['usb', 'nfc'],
  aaguid: 'cb69481e-8ff7-4039-93ec-0a2729a154a8',
  name: null,
  description: 'YubiKey 5 Series'
};

// A throwaway device key pair (never registered on any chain): the gateway is mocked.
// @hiveio/lite-account is ESM-only, which Playwright's loader cannot import.
export const TEST_KEYS = {
  ownerPublicKey: 'STM67vr8aQPGrnXbeKNcMFSbLJBXWpTNbKJGhDEL7xRA1tRsKBtvV',
  postingPublicKey: 'STM7SzVBFaUpKFCgTruZig4UVdRGzurFLvnudxkQbhX1eFtoTEoDc',
  ownerWif: '5JLtFMh9HV23QQCcGK5UY36fjtpFee4ni12SZoJFqJkAzjxGrcC',
  postingWif: '5JR7y1bXahACE9yH7aPrhsThGMtsgDofUBBVeLfbTs78osYAUwd',
  createdAt: '2026-10-21T12:00:00.000Z'
};

const DAY_MS = 86_400_000;
/** A chain time `days` from now (UTC, seconds, no zone). */
export const chainTimeIn = (days: number): string =>
  new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 19);

export type KeyMember = {
  type: string;
  value: string;
  weight: number;
  expires: string | null;
  meta: Record<string, unknown> | null;
  effective_until: string | null;
  active: boolean;
};
export type Authority = { owner: KeyMember[]; posting: KeyMember[] };

export const keyMember = (value: string, extra: Partial<KeyMember> = {}): KeyMember => ({
  type: 'secp256k1',
  value,
  weight: 1,
  expires: extra.expires ?? null,
  meta: null,
  effective_until: extra.expires ?? null,
  active: true,
  ...extra
});

/** The relay's /info; `relaysAuthority` false leaves `update_authority` out of the relayed methods. */
export function relayInfo(relaysAuthority = true) {
  const apps: Record<string, string[]> = { lite_social_test: ['follow', 'unfollow'] };
  if (relaysAuthority) apps[ACCOUNT_APP] = ['update_authority'];
  return {
    enabled: true,
    gate_account: 'test-gateway-4',
    chain_id: CHAIN_ID,
    apps: { account: ACCOUNT_APP, posts: 'lite_posts_test' },
    limits: { l2: { apps, rate: { max: 30, window_s: 600 }, authority_rate: { max: 10, window_s: 3600 } } }
  };
}

type WireKey = {
  member: { type: string; value: string };
  weight: number;
  expires?: string;
  meta?: Record<string, unknown>;
};
export type AuthorityOp = {
  method: string;
  args: {
    name: string;
    role: 'owner' | 'posting';
    authority: { weight_threshold: number; key_auths: WireKey[] };
  };
};
export type RelayedTx = { app: string; operations: AuthorityOp[]; signatures: string[] };

const toMembers = (keys: WireKey[]): KeyMember[] =>
  keys.map((key) =>
    keyMember(key.member.value, { weight: key.weight, expires: key.expires ?? null, meta: key.meta ?? null })
  );

/**
 * Answers `/api/lite-reply` (the relay's /info), the gateway's authority read of `name` and its
 * `/l2`: a relayed `update_authority` replaces that role in `authority`, so the next read shows it.
 * Returns the relayed transactions and the live authority.
 */
export async function mockPasskeyGateway(
  page: Page,
  name: string,
  authority: Authority,
  relaysAuthority = true
) {
  const relayed: RelayedTx[] = [];
  await page.route('**/api/lite-reply', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: relayInfo(relaysAuthority) })
      : route.fallback()
  );
  await page.route(`**/api/lite-gateway/names/*/authority`, (route) => {
    const asked = decodeURIComponent(route.request().url().split('/names/')[1].split('/')[0]);
    if (asked !== name)
      return route.fulfill({ status: 404, json: { ok: false, code: 'not_found', message: 'unknown name' } });
    return route.fulfill({
      json: {
        ok: true,
        name,
        roles: {
          owner: { weight_threshold: 1, members: authority.owner },
          posting: { weight_threshold: 1, members: authority.posting }
        },
        head_block_time: chainTimeIn(0)
      }
    });
  });
  await page.route('**/api/lite-gateway/l2', (route) => {
    const tx = (route.request().postDataJSON() as { tx: RelayedTx }).tx;
    relayed.push(tx);
    for (const op of tx.operations) {
      if (op.method === 'update_authority') authority[op.args.role] = toMembers(op.args.authority.key_auths);
    }
    return route.fulfill({
      status: 202,
      json: { ok: true, trx_id: '0'.repeat(40), gate: 'test-gateway-4', app: tx.app }
    });
  });
  return { relayed, authority };
}

/**
 * How the stub signer answers the request: with its result (reporting `authenticator`, `YUBIKEY` by
 * default, none when null: an older signer; deriving `keys` per role over `SIGNER_KEYS`), a signer
 * error code, or by closing its window unanswered.
 */
export type SignerBehaviour =
  | { kind: 'answer'; authenticator?: Record<string, unknown> | null; keys?: Record<number, string> }
  | { kind: 'error'; code: string }
  | { kind: 'close' };

function signerPage(behaviour: SignerBehaviour): string {
  const reported =
    behaviour.kind === 'answer' && behaviour.authenticator !== undefined ? behaviour.authenticator : YUBIKEY;
  return `<!doctype html><html><body><p>Stub signer</p><script>
const behaviour = ${JSON.stringify(behaviour)};
const report = ${JSON.stringify(reported ? { authenticator: reported } : {})};
const derived = ${JSON.stringify({ ...SIGNER_KEYS, ...(behaviour.kind === 'answer' ? behaviour.keys : {}) })};
window.addEventListener('message', (event) => {
  const request = event.data;
  if (!request || request.hiveSigner !== '1' || !request.id) return;
  // Reported to its own origin before answering: the opener closes the window once answered.
  fetch('/__signer-requests', { method: 'POST', body: JSON.stringify(request) })
    .catch(() => undefined)
    .then(() => answer(event, request));
});
function answer(event, request) {
  if (behaviour.kind === 'close') return window.close();
  const reply = (body) => event.source.postMessage({ hiveSigner: '1', id: request.id, ...body }, event.origin);
  if (behaviour.kind === 'error') return reply({ error: { code: behaviour.code, message: behaviour.code } });
  if (request.method === 'getPublicKeys') {
    const roles = Array.isArray(request.params.roles) ? request.params.roles : [0];
    const keys = roles.map((role) => ({ path: "m/48'/13'/0'/" + role + "'/0'", role, account: 0, key: 0, publicKey: derived[role] }));
    return reply({ result: { keys, ...report } });
  }
  const signatures = ['1f' + '00'.repeat(64)];
  reply({ result: { signedTransaction: { ...request.params.transaction, signatures }, signatures, digest: '00'.repeat(32), ...report } });
}
window.opener.postMessage({ hiveSignerReady: true, hiveSigner: '1' }, '*');
</script></body></html>`;
}

/**
 * Serves `/sign/` of every signer origin as a stub speaking the signer's popup protocol (the real
 * signer derives its keys from a passkey's PRF output; offline, this page answers in its place).
 * Returns the requests it received, with the origin they were sent to.
 */
export async function stubSigners(context: BrowserContext, behaviour: SignerBehaviour = { kind: 'answer' }) {
  const opened: string[] = [];
  for (const origin of [SIGNER, OTHER_SIGNER]) {
    await context.route(`${origin}/__signer-requests`, (route) => route.fulfill({ status: 204 }));
    await context.route(`${origin}/sign/`, (route) => {
      opened.push(origin);
      return route.fulfill({ contentType: 'text/html', body: signerPage(behaviour) });
    });
  }
  return opened;
}

export type SignerRequest = { method: string; params: Record<string, unknown> };

/** The requests the stub signers receive from now on (each reports it to its own origin). */
export async function recordSignerRequests(context: BrowserContext) {
  const requests: SignerRequest[] = [];
  for (const origin of [SIGNER, OTHER_SIGNER]) {
    await context.route(`${origin}/__signer-requests`, (route) => {
      requests.push(route.request().postDataJSON() as SignerRequest);
      return route.fulfill({ status: 204 });
    });
  }
  return requests;
}

/** Sets the deployment's signer list (`REACT_APP_PASSKEY_SIGNERS`) as the browser reads it from __ENV.js. */
export async function configureSigners(page: Page, signers: string[]) {
  await page.route('**/__ENV.js*', async (route) => {
    const response = await route.fetch();
    const body = `${await response.text()}\nwindow.__ENV.REACT_APP_PASSKEY_SIGNERS = ${JSON.stringify(JSON.stringify(signers))};`;
    return route.fulfill({ response, body });
  });
}

/** Stores the lite identity `identity` before the page loads. */
export async function holdIdentity(page: Page, identity: Record<string, unknown>) {
  await page.addInitScript((value) => {
    window.localStorage.setItem(
      'lite-identity',
      JSON.stringify({ value, expiresAt: null, createdAt: Date.now() })
    );
  }, identity);
}

/** A registered identity holding both keys, as a first post leaves it. */
export const unsecuredIdentity = (name: string) => ({ ...TEST_KEYS, name, registered: true });

/** A secured identity: the root's public key and the signer, the posting key only. */
export function securedIdentity(name: string, deviceExpires: string) {
  const { ownerWif: _owner, ...keys } = TEST_KEYS;
  return {
    ...keys,
    name,
    registered: true,
    ownerPublicKey: ROOT_KEY,
    secured: true,
    signer: SIGNER,
    deviceExpires
  };
}

/** The browser's stored lite identity, or null. */
export const storedIdentity = (page: Page) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem('lite-identity');
    return raw ? (JSON.parse(raw) as { value: Record<string, unknown> }).value : null;
  });

/** Opens the header's Login dialog once the page has hydrated, and waits for its sign-in form. */
export async function openLoginDialog(page: Page) {
  const dialog = page.getByTestId('login-dialog');
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.getByTestId('login-btn').click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass();
  await expect(dialog.getByTestId('other-sign-in-options-button')).toBeVisible();
  return dialog;
}
