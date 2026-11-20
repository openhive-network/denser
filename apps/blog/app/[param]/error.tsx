'use client';

import { useEffect } from 'react';
import { Button } from '@ui/components/button';
import { handleError } from '@ui/lib/handle-error';
import { useTranslation } from '@/blog/i18n/client';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import ProfileLoadError from '@/blog/features/layouts/user-profile/profile-load-error';

const PROFILE_SEGMENT = '(user-profile)';

export default function ParamError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation('common_blog');
  const router = useRouter();
  const segment = useSelectedLayoutSegment();

  useEffect(() => {
    handleError(error, { method: 'ParamErrorBoundary', params: { digest: error.digest } });
  }, [error]);

  // A profile layout's own error (e.g. its account lookup failed) reaches this boundary, not the
  // profile's error.tsx, which only wraps the layout's children.
  if (segment === PROFILE_SEGMENT) return <ProfileLoadError error={error} reset={reset} />;

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h3 className="text-xl font-bold">{t('global.something_went_wrong')}</h3>
      <p className="text-muted-foreground">{t('global.page_load_failed')}</p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>{t('chat_widget.retry')}</Button>
        <Button variant="outline" onClick={() => router.push('/')}>
          {t('user_profile.go_home')}
        </Button>
      </div>
    </div>
  );
}
