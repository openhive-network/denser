'use client';

import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { ReactNode } from 'react';
import { useTranslation } from 'next-i18next';

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common_blog');
  const { user } = useUserClient();
  if (!user.username)
    return (
      <div
        className="block bg-green-50 px-4 py-6 text-sm font-light shadow-sm dark:bg-slate-800"
        data-testid="log-in-to-make-post-message"
      >
        {t('submit_page.log_in_to_post')}
      </div>
    );
  return children;
}
