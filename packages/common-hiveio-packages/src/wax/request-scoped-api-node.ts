/**
 * Pick the wax chain a server render should use without letting one SSR
 * request's API-node cookie stick to the process-wide singleton.
 *
 * Wax's `endpointUrl` setter writes the originator as well as the child, so
 * assigning it on a shared chain (or on an extend() view of that chain) leaks
 * the node to every later request. `extendConfig({ apiEndpoint })` builds a
 * new chain whose default endpoint is the request's node and does not update
 * the parent.
 *
 * Every extendConfig() chain allocates wasm state that is never freed, so the
 * views are cached per (shared chain, node) instead of being built per request.
 * A view is keyed only by its node and is never mutated, so handing it to every
 * request that asked for that node shares nothing user-specific. The node set
 * is bounded by the cookie allowlist. Views of a shared chain that was reset
 * (wasm recovery) are dropped together with it.
 */

/**
 * @param createView builds the view of `shared` for `node`, normally
 *   `shared.extendConfig({ ...sameConfig, apiEndpoint: node })`.
 */
export function createApiNodeViews<T extends { api: { endpointUrl: string } }>(
  createView: (shared: T, node: string) => T,
  onCreate?: (node: string, shared: T) => void
) {
  const views = new WeakMap<T, Map<string, T>>();

  return (shared: T, preferred: string | undefined): T => {
    if (!preferred || preferred === shared.api.endpointUrl) {
      return shared;
    }

    let byNode = views.get(shared);
    if (!byNode) {
      byNode = new Map();
      views.set(shared, byNode);
    }

    let view = byNode.get(preferred);
    if (!view) {
      view = createView(shared, preferred);
      byNode.set(preferred, view);
      onCreate?.(preferred, shared);
    }
    return view;
  };
}
