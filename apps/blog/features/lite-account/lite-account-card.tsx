'use client';

import UserAvatar from '@/blog/features/post-rendering/user-avatar';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { useTranslation } from '@/blog/i18n/client';
import LiteDidBadge from './lite-did-badge';
import { authorDisplayName } from './lite-did';
import AuthorProfileLink from './author-profile-link';
import LiteSocialButtons from './lite-social-buttons';

/**
 * The author card of a lite account, linking its profile; a guest acting as a lite account gets
 * Follow and Mute where the node and gateway serve lite social ops.
 */
export default function LiteAccountCard({ author }: { author: string }) {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  return (
    <div className="flex items-start gap-3 p-4" data-testid="lite-account-card">
      <UserAvatar username={author} size="medium" className="h-14 w-14" />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <AuthorProfileLink
            author={author}
            className="text-base font-semibold text-foreground hover:text-destructive"
            data-testid="lite-account-card-name"
          >
            <span translate="no">{authorDisplayName(author)}</span>
          </AuthorProfileLink>
          <LiteDidBadge />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t('lite_account.card_description')}</p>
        {user.isLoggedIn ? null : (
          <div className="mt-2 flex gap-2 empty:hidden">
            <LiteSocialButtons target={author} variant="outlineRed" fallback={null} />
          </div>
        )}
      </div>
    </div>
  );
}
