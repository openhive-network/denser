/**
 * Health check endpoint for container orchestration (Docker, Kubernetes).
 *
 * This endpoint is specifically designed to avoid the TransformStream corruption
 * issue that occurs when health checkers close connections early on streaming pages.
 * See: https://github.com/vercel/next.js/discussions/75995
 *
 * Usage: Configure container health checks to use /api/health instead of /
 */
export async function GET() {
  return Response.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}

// Force static generation - no streaming, no server-side rendering
export const dynamic = 'force-static';
