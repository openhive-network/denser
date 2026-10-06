/**
 * Test stub for `@ui/lib/api-node-preference`.
 *
 * The real module reads site config and Next.js request cookies; unit tests run
 * outside a request, where the real resolver also yields no preferred node.
 */
export const resolvePreferredApiNode = async (): Promise<string | undefined> => undefined;
