'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLiteProfile, servesLiteProfile } from '@transaction/lib/lite-api';
import { StaleTime } from '@/blog/lib/react-query';
import { useTranslation } from '@/blog/i18n/client';
import { useLiteApiInfo } from './use-lite-api-info';

// The URL comes from chain data: only a web address may become a link.
function webUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * "Posted through another gateway" under an owned lite entry whose L1 author `gateAccount` is not
 * one of this gateway's: links that gateway when the gate's `lite.get_profile` names its URL. The
 * profile is asked only of a node serving the method, under the key `LiteGatewayNote` shares.
 */
export default function LiteForeignGatewayNote({ gateAccount, separator }: { gateAccount: string; separator: ReactNode }) {
  const { t } = useTranslation('common_blog');
  const info = useLiteApiInfo();
  const { data } = useQuery({
    queryKey: ['liteProfile', gateAccount],
    queryFn: () => getLiteProfile(gateAccount),
    enabled: servesLiteProfile(info),
    staleTime: StaleTime.MEDIUM
  });
  const href = webUrl(data?.lite?.gateway_url);
  const text = t('lite_account.manage.foreign_gateway_note');
  return (
    <>
      {separator}
      <span className="flex items-center text-xs text-muted-foreground" data-testid="lite-foreign-gateway-note">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline" data-testid="lite-foreign-gateway-link">
            {text}
          </a>
        ) : (
          text
        )}
      </span>
    </>
  );
}
