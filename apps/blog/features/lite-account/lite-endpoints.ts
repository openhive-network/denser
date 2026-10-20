import { appApiPath } from '@hive/ui/lib/app-api-path.ts';

// The app's own lite routes, under the base path: Next.js does not prefix `fetch` with it.

export const liteRelayEndpoint = (): string => appApiPath('/api/lite-reply');

export const liteGatewayHealthEndpoint = (): string => appApiPath('/api/lite-reply/health');

/** The allow-listed gateway pass-through; `path` is its route (`/post`, `/queue/<id>`, …), if any. */
export const liteGatewayEndpoint = (path = ''): string => appApiPath(`/api/lite-gateway${path}`);
