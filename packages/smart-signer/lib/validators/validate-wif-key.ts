import { getChain } from "@hive/common-hiveio-packages";

/**
 * Checks that `password` is a valid WIF private key. Loads the wax chain (and its wasm) on first
 * use: login forms are where a visitor who has only been reading first needs it.
 */
export async function validateWifKey(
  password: string,
): Promise<string | null> {
  if (!password) {
    return 'WIF should not be empty.';
  }
  const hiveChain = await getChain();
  let validWif = false;
  try {
    validWif = !!hiveChain.calculatePublicKey(password);
  } catch {}
  if (!validWif) {
    return 'Invalid WIF key.';
  }
  return null;
}
