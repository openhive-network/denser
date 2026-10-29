'use client';

import AuthorProfileLink from './author-profile-link';
import LiteDidBadge from './lite-did-badge';
import { authorDisplayName, isLiteDid } from './lite-did';

/** An account's name linking its profile: a lite DID by its bare name with the lite badge. */
export default function AccountNameLink({ account, className }: { account: string; className?: string }) {
  return (
    <span className="inline-flex items-center">
      <AuthorProfileLink author={account} className={className} data-testid="account-name-link">
        <span translate="no">{authorDisplayName(account)}</span>
      </AuthorProfileLink>
      {isLiteDid(account) ? <LiteDidBadge /> : null}
    </span>
  );
}
