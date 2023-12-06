import { type NextRequest, NextResponse } from 'next/server';
import { getLogger } from "@hive/ui/lib/logging";

const logger = getLogger('app');

export function GET(
      request: NextRequest,
      { params }: { params: { uid: string } }
    ): NextResponse {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const uid = params.uid;
  logger.info('bamboo query %o', {query, uid});
  return new NextResponse('Hello, Next.js!', { status: 200 })
}
