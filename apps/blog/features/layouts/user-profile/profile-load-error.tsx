'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import ServiceUnavailableRetry from '@/blog/components/service-unavailable-retry';

/**
 * Error boundary content of a profile page whose server render failed. A nonexistent account is a
 * `notFound()` and never lands here, so this says the profile could not be loaded and retries.
 */
export default function ProfileLoadError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const { t } = useTranslation('common_blog');
  const goHome = useCallback(() => router.push('/'), [router]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8" data-testid="profile-load-error">
      <h3 className="text-xl font-bold">{t('user_profile.load_failed_title')}</h3>
      <p className="text-muted-foreground">{t('user_profile.load_failed_description')}</p>
      <div className="flex flex-col items-center gap-2">
        <ServiceUnavailableRetry reset={reset} />
        <Button variant="outline" onClick={goHome}>
          {t('user_profile.go_home')}
        </Button>
      </div>
    </div>
  );
}
