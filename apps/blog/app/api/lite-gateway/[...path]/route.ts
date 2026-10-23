import { forwardToGateway } from '@/blog/lib/lite-relay/gateway';
import { allowedGatewayPath, type GatewayMethod } from '@/blog/lib/lite-relay/gateway-paths';

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: Context, method: GatewayMethod): Promise<Response> {
  const { path } = await context.params;
  const target = allowedGatewayPath(method, path);
  if (!target) {
    return Response.json({ ok: false, code: 'not_found', message: 'not a lite gateway endpoint' }, { status: 404 });
  }
  return forwardToGateway(request, target, method);
}

/**
 * /api/lite-gateway/<path> — an allow-listed pass-through to the lite-account gateway:
 * POST reply, post, edit, delete and l2, GET|DELETE queue/<id>, POST queue/<id>/post and
 * GET names/<name>/availability|authority. Any other path or method answers 404 `not_found`.
 */
export function GET(request: Request, context: Context): Promise<Response> {
  return proxy(request, context, 'GET');
}

export function POST(request: Request, context: Context): Promise<Response> {
  return proxy(request, context, 'POST');
}

export function DELETE(request: Request, context: Context): Promise<Response> {
  return proxy(request, context, 'DELETE');
}
