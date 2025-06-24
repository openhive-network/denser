import { commonMiddleware } from '@hive/middleware/lib/common';
import type { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  return await commonMiddleware(request);
}
