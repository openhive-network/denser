/**
 * Pick the wax chain a call should use without letting one SSR request's
 * API-node cookie stick to the process-wide singleton.
 *
 * Wax's `endpointUrl` setter writes the originator as well as the child, so
 * assigning it on a shared chain (or on an extend() view of that chain) leaks
 * the node to every later request. `extendConfig({ apiEndpoint })` builds a
 * new ApiCaller whose default endpoint is the request's node and does not
 * update the parent. The runtime treats the other extendConfig fields as
 * optional and copies them from the parent.
 */

export function chainForApiNode<T extends { api: { endpointUrl: string } }>(
  shared: T,
  preferred: string | undefined,
  server: boolean
): T {
  if (!preferred || preferred === shared.api.endpointUrl) {
    return shared;
  }

  // Browser: one user. Keep the existing client behavior of pointing the
  // singleton at the localStorage selection.
  if (!server) {
    shared.api.endpointUrl = preferred;
    return shared;
  }

  const extendConfig = (
    shared as T & {
      extendConfig: (config: { apiEndpoint: string }) => T;
    }
  ).extendConfig;

  return extendConfig.call(shared, { apiEndpoint: preferred });
}
