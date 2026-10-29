'use client';

import { Badge } from '@ui/components/badge';
import { useTranslation } from '@/blog/i18n/client';
import { liteAttribution } from './lite-attribution';
import { relayAppIds, useLiteRelayInfo } from './use-lite-relay-info';

/** "lite account <name>" next to a bridged comment's (gate) author. */
export default function LiteAuthorBadge({ jsonMetadata }: { jsonMetadata: unknown }) {
  const { t } = useTranslation('common_blog');
  const relay = useLiteRelayInfo();
  const attribution = liteAttribution(jsonMetadata, relayAppIds(relay.data));
  if (!attribution) return null;
  return (
    <Badge
      variant="outline"
      className="mx-1 border-blue-400/60 text-xs font-normal"
      title={t('lite_account.badge_tooltip')}
      data-testid="lite-author-badge"
    >
      {t('lite_account.badge_prefix')} {attribution.attester}
    </Badge>
  );
}
