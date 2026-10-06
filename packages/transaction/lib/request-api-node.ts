/**
 * Server-side routing of read-only JSON-RPC calls to the current request's API node.
 *
 * The read chain is a process-wide object that callers use synchronously
 * (`getReadChain().api.bridge.get_post(...)`), while the request's node comes from the
 * `api-node` cookie, which Next 16 only exposes asynchronously. This wrapper resolves the
 * node when a call is made, inside that request's async context, and sends the call to a
 * chain configured for that node. Nothing request-specific is stored on the shared object,
 * so one visitor's node never reaches another request.
 *
 * Only `chain.api` calls are routed; `restApi`, `chainId`, `endpointUrl` and every
 * non-call property read come from `defaultChain` (the operator-configured node).
 */

export interface IRequestApiNodeOptions<T> {
  /** The current request's preferred node, or undefined for the default. */
  resolveNode: () => Promise<string | undefined>;
  /** A chain whose JSON-RPC calls go to `node`. Should be cached per node by the caller. */
  chainForNode: (node: string) => T;
}

const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

const resolvePath = (api: object, path: readonly string[]): unknown =>
  path.reduce<unknown>((node, key) => (isObjectLike(node) ? Reflect.get(node, key) : undefined), api);

export function wrapChainWithRequestApiNode<T extends { readonly api: object }>(
  defaultChain: T,
  { resolveNode, chainForNode }: IRequestApiNodeOptions<T>
): T {
  const call = async (path: readonly string[], args: unknown[]): Promise<unknown> => {
    const node = await resolveNode();
    const target = node ? chainForNode(node) : defaultChain;
    const method = resolvePath(target.api, path);
    if (typeof method !== 'function') throw new TypeError(`chain.api.${path.join('.')} is not callable`);
    return Reflect.apply(method, undefined, args);
  };

  const createApiProxy = (path: readonly string[]): object =>
    new Proxy(function apiPath() {}, {
      get: (_target, prop) => {
        if (prop === 'then') return undefined;
        if (typeof prop === 'symbol' || prop === 'endpointUrl') {
          const node = resolvePath(defaultChain.api, path);
          return isObjectLike(node) ? Reflect.get(node, prop) : undefined;
        }
        return createApiProxy([...path, prop]);
      },
      apply: (_target, _thisArg, args: unknown[]) => call(path, args)
    });

  return new Proxy(defaultChain, {
    get: (target, prop, receiver) => (prop === 'api' ? createApiProxy([]) : Reflect.get(target, prop, receiver))
  });
}
