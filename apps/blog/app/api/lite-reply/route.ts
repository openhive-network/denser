import type { LiteReplyResponse } from '@hive/lite-account';
import { getLogger } from '@ui/lib/logging';
import { broadcastBridgedReply } from '@/blog/lib/lite-relay/broadcast';
import { liteRelayConfig } from '@/blog/lib/lite-relay/config';
import { allow, clientIp, DEFAULT_LIMITS } from '@/blog/lib/lite-relay/rate-limit';
import { liteReplyRequestSchema } from '@/blog/lib/lite-relay/schema';
import { RelayValidationError, validateReply } from '@/blog/lib/lite-relay/validate';

const logger = getLogger('lite-relay');

function reply(body: LiteReplyResponse, status: number): Response {
  return Response.json(body, { status });
}

/** GET /api/lite-reply — whether this deployment runs a relay, and which gate/chain/app ids it serves. */
export async function GET(): Promise<Response> {
  const cfg = liteRelayConfig();
  if (!cfg) return Response.json({ enabled: false }, { status: 200 });
  return Response.json({ enabled: true, gate_account: cfg.gateAccount, chain_id: cfg.chainId, apps: cfg.apps }, { status: 200 });
}

/**
 * POST /api/lite-reply — the broadcaster relay for lite-account replies.
 * Validates the L2 transactions, applies a rate limit, and broadcasts the bridged
 * comment + attestation as one L1 transaction signed by the gate account.
 */
/**
 * Node errors carry multi-kilobyte C++ dumps wrapped in generic "Non-typed Error during
 * Wasm call" / "0 exception: unspecified" lines; the client only needs the first line
 * that says something.
 */
function shortErrorMessage(message: string): string {
  const generic = /^(Non-typed Error during Wasm call|\d+ exception: unspecified)/;
  const lines = message.split('\n').map((l) => l.trim()).filter((l) => l !== '');
  const informative = lines.find((l) => !generic.test(l) && !l.startsWith('{')) ?? lines[0] ?? 'broadcast failed';
  return informative.length > 200 ? `${informative.slice(0, 200)}…` : informative;
}

export async function POST(request: Request): Promise<Response> {
  const cfg = liteRelayConfig();
  if (!cfg) return reply({ ok: false, code: 'relay_unavailable', message: 'lite relay is not configured' }, 503);

  const parsed = liteReplyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return reply({ ok: false, code: 'invalid_request', message: parsed.error.issues[0]?.message ?? 'invalid request' }, 400);
  }
  const req = parsed.data;

  const ip = clientIp(request);
  if (!allow(`ip:${ip}`, DEFAULT_LIMITS.ip) || (req.client_id && !allow(`client:${req.client_id}`, DEFAULT_LIMITS.client))) {
    return reply({ ok: false, code: 'rate_limited', message: 'too many replies, try again later' }, 429);
  }

  try {
    const { permlink } = validateReply(req, cfg);
    const { transactionId } = await broadcastBridgedReply(req, permlink, cfg);
    logger.info({ transactionId, attester: req.attester, permlink }, 'bridged reply broadcast');
    return reply({ ok: true, trx_id: transactionId, l1_author: cfg.gateAccount, permlink }, 200);
  } catch (error) {
    if (error instanceof RelayValidationError) {
      return reply({ ok: false, code: error.code, message: error.message }, 400);
    }
    const fullMessage = error instanceof Error ? error.message : 'broadcast failed';
    logger.error(error, 'bridged reply broadcast failed');
    const code = /already exists|permlink/i.test(fullMessage) ? 'permlink_taken' : 'broadcast_failed';
    return reply({ ok: false, code, message: shortErrorMessage(fullMessage) }, 502);
  }
}
