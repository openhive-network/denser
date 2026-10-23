import {
  addDevice,
  enrollRoot,
  generateKeyPair,
  l2Expiration,
  relayL2,
  removeDevice,
  renewDevice,
  signL2Transaction,
  unsignedL2Transaction,
  type AuthorityKeyMemberView,
  type JcsObject,
  type JcsValue,
  type L2SignedFields,
  type L2Transaction,
  type LiteAuthorityView,
  type MemberMeta
} from '@hiveio/lite-account';
import { DEVICE_LIFETIME_DAYS, chainTimeAfterDays, passkeyRoot } from './lite-authority-state';
import { fetchLiteAuthority, LiteAuthorityError } from './lite-authority-query';
import { liteGatewayEndpoint } from './lite-endpoints';
import { securedIdentity, signedInIdentity, type StoredLiteIdentity } from './lite-identity-record';
import { SIGNER_ROLES, SignerError, type SignerPopup } from './signer-client';

// The passkey flows of a lite account: each edits one role with `lite_account.update_authority`,
// relays it through the gateway's `/l2` and waits until the gateway's authority read shows it.

/** When to read the authority again after a relay: the edit lands a block or two after the 202. */
const APPLIED_POLL_MS = [2000, 3000, 4000, 6000, 8000, 12000, 15000];

/** The gateway that relays authority edits: its chain and the lite_account app id. */
export type AuthorityRelay = { chainId: string; accountApp: string };

const txOptions = (relay: AuthorityRelay) => ({ app: relay.accountApp, expiration: l2Expiration() });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads the authority until `applied` holds; `not_applied` when it never does (the chain refused the edit, or it is slow). */
async function waitUntilApplied(
  name: string,
  applied: (view: LiteAuthorityView) => boolean
): Promise<LiteAuthorityView> {
  for (const delay of APPLIED_POLL_MS) {
    await sleep(delay);
    const view = await fetchLiteAuthority(name).catch(() => null);
    if (view && applied(view)) return view;
  }
  throw new LiteAuthorityError('not_applied', `the authority edit of ${name} did not show up`);
}

async function relayAndWait(name: string, tx: L2Transaction, applied: (view: LiteAuthorityView) => boolean) {
  await relayL2(liteGatewayEndpoint(), tx);
  return waitUntilApplied(name, applied);
}

/** The root's signature from the signer: the transaction relayed is the one built here, with the signer's signatures. */
async function signWithRoot(
  popup: SignerPopup,
  fields: L2SignedFields,
  relay: AuthorityRelay,
  rootKey: string
): Promise<L2Transaction> {
  const { signatures } = await popup.call('signL2Transaction', {
    transaction: unsignedL2Transaction(fields),
    chainId: relay.chainId,
    publicKey: rootKey
  });
  return { ...fields, signatures };
}

function postingMember(view: LiteAuthorityView, key: string): AuthorityKeyMemberView | undefined {
  const members = Object.hasOwn(view.roles, 'posting') ? view.roles.posting.members : [];
  return members.find(
    (member): member is AuthorityKeyMemberView => 'value' in member && member.value === key
  );
}

const isDeviceMember = (member: AuthorityKeyMemberView | undefined): boolean =>
  member?.meta?.kind === 'device';

/** `view` without the posting member `key`, so `addDevice` can restate it with a new `expires` and `meta`. */
const withoutPostingKey = (view: LiteAuthorityView, key: string): LiteAuthorityView => ({
  ...view,
  roles: {
    ...view.roles,
    posting: {
      ...view.roles.posting,
      members: view.roles.posting.members.filter((member) => !('value' in member) || member.value !== key)
    }
  }
});

function withoutSigner(value: JcsValue): JcsValue {
  if (Array.isArray(value)) return value.map(withoutSigner);
  if (value === null || typeof value !== 'object') return value;
  return withoutSignerFields(value);
}

function withoutSignerFields(value: JcsObject): JcsObject {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, field]) => (key === 'signer' ? [] : [[key, withoutSigner(field)]]))
  );
}

/** `fields` with no `meta.signer` on any member: the guest chose not to put the signer origin on chain. */
const withoutSignerMeta = (fields: L2SignedFields): L2SignedFields => ({
  ...fields,
  operations: fields.operations.map((op) => ({ ...op, args: withoutSignerFields(op.args) }))
});

const deviceMeta = (label: string, signer: string | undefined): MemberMeta => ({
  kind: 'device',
  ...(label ? { label } : {}),
  ...(signer ? { signer } : {})
});

export type SecureParams = {
  identity: StoredLiteIdentity;
  /** The chosen signer, opened from the click. */
  popup: SignerPopup;
  /** Whether the signer origin goes into the members' `meta` (it is remembered locally either way). */
  recordSigner: boolean;
  label: string;
  relay: AuthorityRelay;
  nowMs?: number;
};

/**
 * Secures the unsecured lite account `identity`: the signer's owner key (account 0) becomes the root.
 * Signed by the browser's owner key, two edits: this browser's posting key restated with a
 * `DEVICE_LIFETIME_DAYS` expiry and `kind: device` meta, then the owner as the root (`enrollRoot`).
 * Each is relayed and confirmed before the next; one already on chain is skipped, so a retry
 * resumes. Resolves with the identity to store: without the owner key.
 */
export async function secureLiteAccount({
  identity,
  popup,
  recordSigner,
  label,
  relay,
  nowMs = Date.now()
}: SecureParams): Promise<StoredLiteIdentity> {
  const { name, ownerWif, postingPublicKey } = identity;
  if (!ownerWif)
    throw new LiteAuthorityError('not_owner', `this browser does not hold the owner key of ${name}`);
  const { keys } = await popup.call('getPublicKeys', { roles: [SIGNER_ROLES.owner], account: 0 });
  const rootKey = keys.find((key) => key.role === SIGNER_ROLES.owner)?.publicKey;
  if (!rootKey) throw new SignerError('internal', 'the signer returned no owner key');
  const signer = recordSigner ? popup.origin : undefined;
  const expires = chainTimeAfterDays(DEVICE_LIFETIME_DAYS, nowMs);
  let current = await fetchLiteAuthority(name);

  if (!isDeviceMember(postingMember(current, postingPublicKey))) {
    const fields = addDevice({
      name,
      current: withoutPostingKey(current, postingPublicKey),
      deviceKey: postingPublicKey,
      expires,
      meta: deviceMeta(label, signer),
      ...txOptions(relay)
    });
    current = await relayAndWait(name, signL2Transaction(fields, relay.chainId, [ownerWif]), (view) =>
      isDeviceMember(postingMember(view, postingPublicKey))
    );
  }
  const deviceExpires = postingMember(current, postingPublicKey)?.expires ?? expires;

  if (passkeyRoot(current)?.key !== rootKey) {
    const enrolled = enrollRoot({
      name,
      current,
      rootKey: { key: rootKey, signer: popup.origin },
      ...txOptions(relay)
    });
    const fields = recordSigner ? enrolled : withoutSignerMeta(enrolled);
    await relayAndWait(
      name,
      signL2Transaction(fields, relay.chainId, [ownerWif]),
      (view) => passkeyRoot(view)?.key === rootKey
    );
  }
  return securedIdentity(identity, rootKey, popup.origin, deviceExpires);
}

export type SignInParams = {
  name: string;
  /** The authority read that found the account's passkey root. */
  current: LiteAuthorityView;
  popup: SignerPopup;
  label: string;
  relay: AuthorityRelay;
  nowMs?: number;
};

/**
 * Signs this browser in to the secured lite account `name`: a fresh posting key, added by the root
 * (signed in the signer) with a `DEVICE_LIFETIME_DAYS` expiry and `kind: device` meta. Resolves
 * with the identity to store once the key is a posting member; the owner key never exists here.
 */
export async function signInOnDevice({
  name,
  current,
  popup,
  label,
  relay,
  nowMs = Date.now()
}: SignInParams): Promise<StoredLiteIdentity> {
  const root = passkeyRoot(current);
  if (!root) throw new LiteAuthorityError('not_secured', `${name} has no passkey root`);
  const posting = generateKeyPair();
  const deviceExpires = chainTimeAfterDays(DEVICE_LIFETIME_DAYS, nowMs);
  const fields = addDevice({
    name,
    current,
    deviceKey: posting.publicKey,
    expires: deviceExpires,
    meta: deviceMeta(label, root.signer ?? popup.origin),
    ...txOptions(relay)
  });
  const tx = await signWithRoot(popup, fields, relay, root.key);
  await relayAndWait(name, tx, (view) => !!postingMember(view, posting.publicKey));
  return signedInIdentity({
    name,
    rootKey: root.key,
    signer: popup.origin,
    postingWif: posting.wif,
    postingPublicKey: posting.publicKey,
    deviceExpires,
    nowMs
  });
}

/** Signs this browser out of its secured lite account: its posting key removes itself. Resolves once it is gone (or already was). */
export async function signOutDevice(identity: StoredLiteIdentity, relay: AuthorityRelay): Promise<void> {
  const { name, postingPublicKey, postingWif } = identity;
  const current = await fetchLiteAuthority(name);
  if (!postingMember(current, postingPublicKey)) return;
  const fields = removeDevice({ name, current, deviceKey: postingPublicKey, ...txOptions(relay) });
  await relayAndWait(
    name,
    signL2Transaction(fields, relay.chainId, [postingWif]),
    (view) => !postingMember(view, postingPublicKey)
  );
}

export type RootEditParams = {
  identity: StoredLiteIdentity;
  deviceKey: string;
  popup: SignerPopup;
  relay: AuthorityRelay;
  nowMs?: number;
};

async function rootKeyOf(name: string) {
  const current = await fetchLiteAuthority(name);
  const root = passkeyRoot(current);
  if (!root) throw new LiteAuthorityError('not_secured', `${name} has no passkey root`);
  return { current, rootKey: root.key };
}

/** Removes the posting key `deviceKey` (another device) with the root, signed in the signer. */
export async function removeDeviceWithRoot({
  identity,
  deviceKey,
  popup,
  relay
}: RootEditParams): Promise<void> {
  const { current, rootKey } = await rootKeyOf(identity.name);
  const fields = removeDevice({ name: identity.name, current, deviceKey, ...txOptions(relay) });
  await relayAndWait(
    identity.name,
    await signWithRoot(popup, fields, relay, rootKey),
    (view) => !postingMember(view, deviceKey)
  );
}

/** Extends the posting key `deviceKey` by `DEVICE_LIFETIME_DAYS` from now with the root; resolves with the new `expires`. */
export async function renewDeviceWithRoot({
  identity,
  deviceKey,
  popup,
  relay,
  nowMs = Date.now()
}: RootEditParams): Promise<string> {
  const { current, rootKey } = await rootKeyOf(identity.name);
  const expires = chainTimeAfterDays(DEVICE_LIFETIME_DAYS, nowMs);
  const fields = renewDevice({ name: identity.name, current, deviceKey, expires, ...txOptions(relay) });
  await relayAndWait(
    identity.name,
    await signWithRoot(popup, fields, relay, rootKey),
    (view) => postingMember(view, deviceKey)?.expires === expires
  );
  return expires;
}
