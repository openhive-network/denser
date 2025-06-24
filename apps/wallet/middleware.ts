import {commonMiddleware} from '@hive/ui/lib/common-middleware';
import type { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  return await commonMiddleware(request);
}
