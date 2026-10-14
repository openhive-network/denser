/**
 * The base path the offline specs' wallet build is served under, as on the subdirectory deployment
 * (`/wallet` next to the blog's `/blog` on one origin). The build reads it from
 * `NEXT_PUBLIC_BASE_PATH` (package.json `test:fixture`, .aidev/run-fixture-e2e.sh).
 */
export const WALLET_BASE_PATH = '/wallet';

/**
 * The blog URL the offline specs' wallet links to: as on the subdirectory deployment, the blog
 * under its own base path on the same origin. Nothing is served there; specs only check links.
 */
export const FIXTURE_BLOG_URL = 'http://127.0.0.1:3000/blog';
