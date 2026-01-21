import { NextRequest, NextResponse } from 'next/server';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';
import { isHiveAccountNameValid } from '@hive/transaction';

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

    if (!(await isHiveAccountNameValid(username))) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    // Build the image hoster URL
    let imageUrl: string;
    if (size && ['small', 'medium', 'large'].includes(size)) {
      imageUrl = `${configuredImagesEndpoint}u/${username}/avatar/${size}`;
    } else if (width && height) {
      const baseUrl = `${configuredImagesEndpoint}u/${username}/avatar`;
      imageUrl = baseUrl;
    } else {
      imageUrl = `${configuredImagesEndpoint}u/${username}/avatar/small`;
    }

    // Fetch the image from the image hoster and stream it to the client
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Failed to fetch avatar' }, { status: response.status });
    }

    // Prepare headers, copying content-type from the origin
    const headers = new Headers({
      'Content-Type': response.headers.get('content-type') || 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
    });

    // Stream the response body directly
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

