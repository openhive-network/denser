import { reuseHiveChain } from "@hive/common-hiveio-packages";

export function validateWifKey(
  password: string,
): string | null {
  if (!password) {
    return 'WIF should not be empty.';
  }
  // XXX: Take this as a parameter
  const hiveChain = reuseHiveChain();
  let validWif = false;
  try {
    validWif = !!hiveChain?.calculatePublicKey(password);
  } catch {}
  if (!validWif) {
    return 'Invalid WIF key.';
  }
  return null;
}
