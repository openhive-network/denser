import { NextRequest, NextResponse } from 'next/server';
import { configuredImagesEndpoint } from '@hive/ui/config/public-vars';

/**
 * Proxy endpoint for default avatar image that prevents caching
 * Usage: /api/avatar/default
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const defaultUrl = `${configuredImagesEndpoint}DQmb2HNSGKN3pakguJ4ChCRjgkVuDN9WniFRPmrxoJ4sjR4`;

    // Fetch the image from the image hoster and stream it to the client
    const response = await fetch(defaultUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Failed to fetch default avatar' }, { status: response.status });
    }

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
    console.error('Error fetching default avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

