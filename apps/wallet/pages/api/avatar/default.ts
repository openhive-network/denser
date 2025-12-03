import type { NextApiRequest, NextApiResponse } from 'next';
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

    // Fetch the image from the image hoster
    const response = await fetch(defaultUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch default avatar' });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Return the image with cache-preventing headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    return res.status(200).send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Error fetching default avatar:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

