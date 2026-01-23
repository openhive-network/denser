import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Health check endpoint for container orchestration (Docker, Kubernetes).
 *
 * This endpoint is specifically designed to avoid the TransformStream corruption
 * issue that occurs when health checkers close connections early on streaming pages.
 * See: https://github.com/vercel/next.js/discussions/75995
 *
 * Usage: Configure container health checks to use /api/health instead of /
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ status: string; timestamp: string }>
) {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
