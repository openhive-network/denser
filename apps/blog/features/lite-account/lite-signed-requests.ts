import {
  buildLiteDeleteRequest,
  buildLiteEditRequest,
  buildLiteReplyRequest,
  generateKeyPair,
  type BuildLiteDeleteParams,
  type BuildLiteEditParams,
  type BuildLiteReplyParams,
  type BuiltLiteDelete,
  type BuiltLiteEdit,
  type BuiltLiteReply,
  type L2SignedFields,
  type L2Transaction,
  type LiteIdentity
} from '@hiveio/lite-account';
import type { StoredLiteIdentity } from './lite-identity-record.ts';
import type { LiteKeyStore } from './lite-key-store.ts';

// The package's reply, edit and delete builders, signed through the lite key store: each builds its
// request as published, and every transaction in it is signed again with the store's posting key.

/** A builder's parameters with the stored identity and the key store that signs for it. */
type Signed<P> = Omit<P, 'identity'> & { identity: StoredLiteIdentity; keys: LiteKeyStore };

/**
 * The identity as the builders take it: they read its name, registration and public keys, and sign
 * with its posting key. Their signatures are replaced, so they sign with a throwaway key, never
 * with a stored one (a Safe Storage identity has none here).
 */
function builderIdentity(identity: StoredLiteIdentity): LiteIdentity {
  const { wif } = generateKeyPair();
  return { ...identity, ownerWif: wif, postingWif: wif };
}

const unsignedFields = ({ signatures: _replaced, ...fields }: L2Transaction): L2SignedFields => fields;

const signedWithPosting = (keys: LiteKeyStore, tx: L2Transaction): Promise<L2Transaction> =>
  keys.sign('posting', unsignedFields(tx));

/** `buildLiteReplyRequest` with its attestation signed by `keys` (the registration stays unsigned). */
export async function signedLiteReply({ identity, keys, ...params }: Signed<BuildLiteReplyParams>): Promise<BuiltLiteReply> {
  const built = buildLiteReplyRequest({ ...params, identity: builderIdentity(identity) });
  return { ...built, request: { ...built.request, attest_tx: await signedWithPosting(keys, built.request.attest_tx) } };
}

/** `buildLiteEditRequest` with its attestation signed by `keys`. */
export async function signedLiteEdit({ identity, keys, ...params }: Signed<BuildLiteEditParams>): Promise<BuiltLiteEdit> {
  const built = buildLiteEditRequest({ ...params, identity: builderIdentity(identity) });
  return { ...built, request: { ...built.request, attest_tx: await signedWithPosting(keys, built.request.attest_tx) } };
}

/** `buildLiteDeleteRequest` with its retraction and tombstone attestation signed by `keys`. */
export async function signedLiteDelete({ identity, keys, ...params }: Signed<BuildLiteDeleteParams>): Promise<BuiltLiteDelete> {
  const { request } = buildLiteDeleteRequest({ ...params, identity: builderIdentity(identity) });
  const retract = await signedWithPosting(keys, request.retract_tx);
  const tombstone = request.tombstone_attest_tx ? await signedWithPosting(keys, request.tombstone_attest_tx) : undefined;
  return { request: { ...request, retract_tx: retract, ...(tombstone ? { tombstone_attest_tx: tombstone } : {}) } };
}
