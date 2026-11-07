'use client';

import { useEffect } from 'react';
import env from '@beam-australia/react-env';
import { subscribeToBroadcastSettlement } from '@transaction/lib/broadcast-settlement';
import { BroadcastSettledMessage } from '@smart-signer/components/broadcast-settled-message';
import { toast } from '@ui/components/hooks/use-toast';

/**
 * Shows a toast for each broadcast that may still apply once it settles: when a block includes it, or
 * its expiration passes. Renders nothing; mount once per page, next to the `Toaster`.
 */
export function BroadcastSettlementToasts() {
  useEffect(
    () =>
      subscribeToBroadcastSettlement(({ transactionId, settlement }) => {
        toast({
          description: (
            <BroadcastSettledMessage
              transactionId={transactionId}
              settlement={settlement}
              explorerDomain={env('EXPLORER_DOMAIN')}
            />
          ),
          variant: settlement === 'expired' ? 'destructive' : 'default'
        });
      }),
    []
  );
  return null;
}
