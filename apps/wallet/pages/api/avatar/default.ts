import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';

type ResponseData = {
  error?: string;
};

/**
 * Proxy endpoint for default avatar image that prevents caching
 * Usage: /api/avatar/default
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | Buffer>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const defaultUrl = `${configuredImagesEndpoint}DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4`;

    // Fetch the image from the image hoster and stream it to the client
    const response = await fetch(defaultUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok || !response.body) {
      return res.status(response.status).json({ error: 'Failed to fetch default avatar' });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Convert Web ReadableStream to Node.js stream and pipe to response
    const nodeStream = Readable.fromWeb(response.body as import('stream/web').ReadableStream);
    nodeStream.pipe(res);
    return;
  } catch (error) {
    console.error('Error fetching default avatar:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

