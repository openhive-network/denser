import { NextRequest, NextResponse } from 'next/server';
import { handleCspReport } from '@hive/middleware/lib/csp-report';

export function POST(req: NextRequest): Promise<NextResponse> {
  return handleCspReport(req);
}
