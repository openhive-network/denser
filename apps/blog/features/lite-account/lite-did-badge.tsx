'use client';

import { Badge } from '@ui/components/badge';
import { useTranslation } from '@/blog/i18n/client';

/** "lite account" next to an author a lite-aware node names by DID (the lite name is shown already). */
export default function LiteDidBadge() {
  const { t } = useTranslation('common_blog');
  return (
    <Badge
      variant="outline"
      className="mx-1 border-blue-400/60 text-xs font-normal"
      title={t('lite_account.badge_native_tooltip')}
      data-testid="lite-author-badge"
    >
      {t('lite_account.badge_prefix')}
    </Badge>
  );
}
