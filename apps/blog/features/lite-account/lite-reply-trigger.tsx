'use client';

import type { ReactNode } from 'react';
import DialogLogin from '@/blog/components/dialog-login';
import { useLiteRelayInfo } from './use-lite-relay-info';

type Props = { onToggle: () => void; className: string; testId: string; children: ReactNode };

/**
 * The guest "Reply" button: toggles the lite reply box when this deployment runs a
 * relay, otherwise falls back to the sign-in dialog exactly as before.
 */
export default function LiteReplyTrigger({ onToggle, className, testId, children }: Props) {
  const relay = useLiteRelayInfo();
  if (relay.data?.enabled) {
    return (
      <button type="button" onClick={onToggle} className={className} data-testid={testId}>
        {children}
      </button>
    );
  }
  return (
    <DialogLogin>
      <button type="button" className={className} data-testid={testId}>
        {children}
      </button>
    </DialogLogin>
  );
}
