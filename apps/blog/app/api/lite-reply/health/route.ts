import { gatewayHealth, liteGatewayUrl } from '@/blog/lib/lite-relay/gateway';

/**
 * GET /api/lite-reply/health — the lite-account gateway's /health (pool readiness, hived lag),
 * cached for a few seconds. Always 200: a missing or unreachable gateway answers
 * { status: 'down' }, so the client reads every outcome the same way.
 */
export async function GET(): Promise<Response> {
  const base = liteGatewayUrl();
  const health = base ? await gatewayHealth(base) : { status: 'down' };
  return Response.json(health, { status: 200, headers: { 'cache-control': 'no-store' } });
}
