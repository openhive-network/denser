'use client';

import { useTranslation } from '@/blog/i18n/client';

/** What a lite post or comment its author deleted shows in place of its body (the gateway's tombstone). */
export function LiteTombstoneNotice() {
  const { t } = useTranslation('common_blog');
  return (
    <p className="px-2 py-6 italic text-muted-foreground" data-testid="lite-tombstone">
      {t('lite_account.manage.deleted_by_author')}
    </p>
  );
}
