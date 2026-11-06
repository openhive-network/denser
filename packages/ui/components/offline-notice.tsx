'use client';

import { useSyncExternalStore } from 'react';
import { getBrowserConnectivity } from '@transaction/lib/connectivity';

const subscribe = (onChange: () => void): (() => void) => getBrowserConnectivity()?.onChange(onChange) ?? (() => {});
const isConnected = (): boolean => getBrowserConnectivity()?.isConnected() ?? true;
const CONNECTED_ON_SERVER = () => true;

/**
 * One persistent notice while the browser is offline or no API node answers, in place of an error
 * toast for every read that fails meanwhile; gone once the connection is back. `message` is the
 * app's translated text.
 */
export function OfflineNotice({ message }: { message: string }) {
  const connected = useSyncExternalStore(subscribe, isConnected, CONNECTED_ON_SERVER);
  if (connected) return null;
  return (
    <div
      role="status"
      data-testid="offline-notice"
      className="bg-background text-foreground fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-md border px-4 py-2 text-sm shadow-lg"
    >
      {message}
    </div>
  );
}
