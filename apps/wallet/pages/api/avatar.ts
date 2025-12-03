import type { NextApiRequest, NextApiResponse } from 'next';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';

type ResponseData = {
  error?: string;
};

/**
 * Proxy endpoint for user avatars that prevents caching
 * Usage: /api/avatar?username=USERNAME&size=small|medium|large
 *        /api/avatar?username=USERNAME&width=WIDTH&height=HEIGHT
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | Buffer>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, size, width, height } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Build the image hoster URL
    let imageUrl: string;
    if (size && typeof size === 'string' && ['small', 'medium', 'large'].includes(size)) {
      imageUrl = `${configuredImagesEndpoint}u/${username}/avatar/${size}`;
    } else if (width && height) {
      // Use base URL for dimensions - image hoster will handle sizing
      imageUrl = `${configuredImagesEndpoint}u/${username}/avatar`;
    } else {
      // Default to small if no size specified
      imageUrl = `${configuredImagesEndpoint}u/${username}/avatar/small`;
    }

    // Fetch the image from the image hoster
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch avatar' });
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
    console.error('Error fetching avatar:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

