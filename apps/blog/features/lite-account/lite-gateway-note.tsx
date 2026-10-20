'use client';

import { useQuery } from '@tanstack/react-query';
import { getLiteProfile, servesLiteProfile } from '@transaction/lib/lite-api';
import { StaleTime } from '@/blog/lib/react-query';
import { useTranslation } from '@/blog/i18n/client';
import { useLiteApiInfo } from './use-lite-api-info';

/**
 * "Lite-account gateway" on the profile of a Hive account the node's `lite.get_profile` marks as a
 * gateway; nothing elsewhere, and nothing on a node that does not serve the method.
 */
export default function LiteGatewayNote({ username }: { username: string }) {
  const { t } = useTranslation('common_blog');
  const info = useLiteApiInfo();
  const { data } = useQuery({
    queryKey: ['liteProfile', username],
    queryFn: () => getLiteProfile(username),
    enabled: servesLiteProfile(info),
    staleTime: StaleTime.MEDIUM
  });
  if (!data?.lite?.gateway) return null;
  return (
    <p
      className="mt-2 inline-flex rounded-full border border-blue-400/60 px-2 py-0.5 text-xs text-white/90"
      title={t('lite_account.profile.gateway_tooltip')}
      data-testid="lite-gateway-note"
    >
      {t('lite_account.profile.gateway_note')}
    </p>
  );
}
