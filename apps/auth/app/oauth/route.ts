import { type NextRequest, NextResponse } from 'next/server';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export function GET(request: NextRequest): NextResponse {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  return new NextResponse('Hello, Next.js!', { status: 200 })
}
