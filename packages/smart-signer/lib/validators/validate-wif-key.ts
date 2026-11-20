import { getChain } from "@hive/common-hiveio-packages";

/**
 * Checks that `password` is a valid WIF private key: null, or the smart-signer translation key of
 * what is wrong. Loads the wax chain (and its wasm) on first
 * use: login forms are where a visitor who has only been reading first needs it.
 */
export async function validateWifKey(
  password: string,
): Promise<string | null> {
  if (!password) {
    return 'chainvalidation_js.wif_should_not_be_empty';
  }
  const hiveChain = await getChain();
  let validWif = false;
  try {
    validWif = !!hiveChain.calculatePublicKey(password);
  } catch {}
  if (!validWif) {
    return 'login_form.zod_error.invalid_wif';
  }
  return null;
}
