'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitLoggerClient() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    // Fire-and-forget logging; errors are intentionally ignored
    void fetch('/api/page-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pathname })
    }).catch(() => {});
  }, [pathname]);

  return null;
}
