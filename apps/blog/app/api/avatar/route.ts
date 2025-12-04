import { NextRequest, NextResponse } from 'next/server';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';

/**
 * Proxy endpoint for user avatars that prevents caching
 * Usage: /api/avatar?username=USERNAME&size=small|medium|large
 *        /api/avatar?username=USERNAME&width=WIDTH&height=HEIGHT
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = req.nextUrl.searchParams;
    const username = searchParams.get('username');
    const size = searchParams.get('size');
    const width = searchParams.get('width');
    const height = searchParams.get('height');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Build the image hoster URL
    let imageUrl: string;
    if (size && ['small', 'medium', 'large'].includes(size)) {
      imageUrl = `${configuredImagesEndpoint}u/${username}/avatar/${size}`;
    } else if (width && height) {
      // Use proxify logic for dimensions - image hoster uses /p/ hash format with query params
      const baseUrl = `${configuredImagesEndpoint}u/${username}/avatar`;
      // For now, use the base URL and let the image hoster handle dimensions
      // The actual proxification would happen client-side, but we'll fetch the base avatar
      imageUrl = baseUrl;
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
      return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Return the image with cache-preventing headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error fetching avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

