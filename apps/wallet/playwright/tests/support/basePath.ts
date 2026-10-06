/**
 * The base path the offline specs' wallet build is served under, as on the subdirectory deployment
 * (`/wallet` next to the blog's `/blog` on one origin). The build reads it from
 * `NEXT_PUBLIC_BASE_PATH` (package.json `test:fixture`, .aidev/run-fixture-e2e.sh).
 */
export const WALLET_BASE_PATH = '/wallet';
