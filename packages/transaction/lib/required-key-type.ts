export type SigningKeyType = 'owner' | 'active' | 'posting';

/** The accounts whose authority of each role a transaction requires (wax's `requiredAuthorities`) */
interface RequiredAuthorities {
  owner: ReadonlySet<string>;
  active: ReadonlySet<string>;
  posting: ReadonlySet<string>;
}

interface KeyTypeOptions {
  singleSignKeyType?: SigningKeyType;
  requiredKeyType?: SigningKeyType;
}

/**
 * The key a transaction must be signed with, from the authorities its operations require: active
 * when any operation needs active authority, otherwise posting when one needs posting authority.
 * Undefined for owner authority (signed through single sign) and for transactions naming no role,
 * which leave the choice to the signer. A `requiredKeyType` or `singleSignKeyType` the caller
 * passed wins over the derived one.
 */
export function resolveRequiredKeyType(
  { singleSignKeyType, requiredKeyType }: KeyTypeOptions,
  { owner, active, posting }: RequiredAuthorities
): SigningKeyType | undefined {
  if (requiredKeyType || singleSignKeyType) return requiredKeyType;
  if (owner.size > 0) return undefined;
  if (active.size > 0) return 'active';
  if (posting.size > 0) return 'posting';
  return undefined;
}
