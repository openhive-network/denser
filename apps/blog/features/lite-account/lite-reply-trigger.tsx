'use client';

import { useState, type ReactNode } from 'react';
import { toast } from '@ui/components/hooks/use-toast';
import DialogLogin from '@/blog/components/dialog-login';
import { useTranslation } from '@/blog/i18n/client';
import { useLiteApiInfo } from './use-lite-api-info';
import { readiness, readinessText, useLiteGatewayHealth } from './use-lite-gateway-health';
import { useLiteRelayInfo } from './use-lite-relay-info';

type Props = { open: boolean; onToggle: () => void; className: string; testId: string; children: ReactNode };

/**
 * The guest "Reply" button: toggles the lite reply box when this deployment runs a relay, the
 * API node is lite-aware and the gateway is not down, otherwise falls back to the sign-in dialog
 * exactly as before. Opening the box re-asks the gateway first and explains when it cannot take
 * a reply now instead of opening.
 */
export default function LiteReplyTrigger({ open, onToggle, className, testId, children }: Props) {
  const { t } = useTranslation('common_blog');
  const relay = useLiteRelayInfo();
  const liteApi = useLiteApiInfo();
  const offered = !!relay.data?.enabled && !!liteApi.data;
  const health = useLiteGatewayHealth(offered);
  const [checking, setChecking] = useState(false);

  const onClick = async () => {
    if (open) {
      onToggle();
      return;
    }
    setChecking(true);
    const fresh = await health.refetch();
    setChecking(false);
    const ready = readiness(fresh.data, 'reply');
    if (ready.ok) onToggle();
    else toast({ title: t('lite_account.gateway.unavailable_title'), description: readinessText(t, ready), variant: 'destructive' });
  };

  if (offered && health.data && health.data.status !== 'down') {
    return (
      <button type="button" onClick={onClick} disabled={checking} aria-busy={checking} className={className} data-testid={testId}>
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
