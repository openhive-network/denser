'use client';

import UserAvatar from '@/blog/features/post-rendering/user-avatar';
import { useTranslation } from '@/blog/i18n/client';
import LiteDidBadge from './lite-did-badge';
import { authorDisplayName } from './lite-did';

/** The author card of a lite account: it has no profile, follows or mutes until the lite social app. */
export default function LiteAccountCard({ author }: { author: string }) {
  const { t } = useTranslation('common_blog');
  return (
    <div className="flex items-start gap-3 p-4" data-testid="lite-account-card">
      <UserAvatar username={author} size="medium" className="h-14 w-14" />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-base font-semibold text-foreground" translate="no" data-testid="lite-account-card-name">
            {authorDisplayName(author)}
          </span>
          <LiteDidBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t('lite_account.card_description')}</p>
      </div>
    </div>
  );
}
