import { getLogger } from '@ui/lib/logging';
import { callGateway, forwardToGateway, liteGatewayUrl, relayed } from '@/blog/lib/lite-relay/gateway';

const logger = getLogger('lite-relay');

/**
 * GET /api/lite-reply — the lite-account gateway's /info (gate account, chain id, app ids,
 * limits), or { enabled: false } when no gateway is configured or it cannot be reached, so
 * the UI simply hides the feature.
 */
export async function GET(): Promise<Response> {
  const base = liteGatewayUrl();
  if (!base) return Response.json({ enabled: false }, { status: 200 });
  try {
    const result = await callGateway(base, '/info', { method: 'GET' });
    if (result.status === 200) return relayed(result);
    logger.warn({ status: result.status }, 'lite gateway info unavailable');
  } catch (error) {
    logger.warn(error, 'lite gateway unreachable');
  }
  return Response.json({ enabled: false }, { status: 200 });
}

/**
 * POST /api/lite-reply — the reply alias of POST /api/lite-gateway/reply: the request goes to the
 * gateway's /reply as is (validation, rate limits and the L1 broadcast all happen in the gateway).
 */
export function POST(request: Request): Promise<Response> {
  return forwardToGateway(request, '/reply', 'POST');
}
