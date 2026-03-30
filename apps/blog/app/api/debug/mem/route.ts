import { NextResponse } from 'next/server';
import v8 from 'v8';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (process.env.DENSER_DEBUG_MEM !== 'true') {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // Force GC if available (requires --expose-gc)
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
    // Run GC twice — first pass collects weak refs, second pass collects
    // dependents. Wait a tick between to allow FinalizationRegistry callbacks.
    await new Promise(r => setTimeout(r, 50));
    globalThis.gc();
  }

  const mem = process.memoryUsage();

  if (action === 'snapshot') {
    const filename = v8.writeHeapSnapshot(
      path.join('/tmp', `heap-${Date.now()}.heapsnapshot`)
    );
    return NextResponse.json({ ...formatMem(mem), snapshot: filename });
  }

  return NextResponse.json(formatMem(mem));
}

function formatMem(mem: NodeJS.MemoryUsage) {
  return {
    timestamp: Date.now(),
    rss_mb: +(mem.rss / 1024 / 1024).toFixed(2),
    heapTotal_mb: +(mem.heapTotal / 1024 / 1024).toFixed(2),
    heapUsed_mb: +(mem.heapUsed / 1024 / 1024).toFixed(2),
    external_mb: +(mem.external / 1024 / 1024).toFixed(2),
    arrayBuffers_mb: +(mem.arrayBuffers / 1024 / 1024).toFixed(2),
  };
}
