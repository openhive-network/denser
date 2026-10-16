/**
 * Test stub for `@ui/lib/utils`, whose wax-typed helpers do not compile against the wax stubs.
 * Only the helpers the transaction modules read are provided, with the same behaviour.
 */
export function isJSON(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
