'use client';

import { Badge } from '@ui/components/badge';
import { useTranslation } from '@/blog/i18n/client';
import { liteAttribution } from './lite-attribution';
import { relayAppIds, useLiteRelaySelect } from './use-lite-relay-info';

/** "lite account <name>" next to a bridged comment's (gate) author. */
export default function LiteAuthorBadge({ jsonMetadata }: { jsonMetadata: unknown }) {
  const { t } = useTranslation('common_blog');
  const attribution = useLiteRelaySelect((info) => liteAttribution(jsonMetadata, relayAppIds(info)));
  if (!attribution) return null;
  return (
    <Badge
      variant="outline"
      className="mx-1 border-blue-400/60 text-xs font-normal"
      title={t('lite_account.badge_tooltip')}
      data-testid="lite-author-badge"
    >
      {/* eslint-disable-next-line @hive/i18n/no-joined-translation -- an existing fragment join, to become one key with placeholders */}
      {t('lite_account.badge_prefix')} {attribution.attester}
    </Badge>
  );
}
