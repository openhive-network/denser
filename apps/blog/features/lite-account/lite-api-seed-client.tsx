'use client';

import { useEffect } from 'react';
import type { ILiteApiInfo } from '@hive/common-hiveio-packages/wax';
import { seedLiteApiInfo } from '@transaction/lib/lite-api';

/** Seeds the browser's lite probe with the server's answer for `endpoint`; renders nothing. */
export default function LiteApiSeedClient({ endpoint, info }: { endpoint: string; info: ILiteApiInfo | null }) {
  useEffect(() => {
    seedLiteApiInfo(endpoint, info);
  }, [endpoint, info]);
  return null;
}
