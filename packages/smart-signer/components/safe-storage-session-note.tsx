/* The account menu's note on a safe-storage session: locked, or how long it stays unlocked while idle */
import { FC } from 'react';
import { cn } from '@ui/lib/utils';
import { Icons } from '@ui/components/icons';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { useSafeStorageLockState } from '@smart-signer/lib/auth/use-safe-storage-lock';
import SessionTimeNote from '@smart-signer/components/session-time-note';
import { LoginType, type User } from '@smart-signer/types/common';

const SafeStorageSessionNote: FC<{ user: User; className?: string }> = ({ user, className }) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const lockState = useSafeStorageLockState(user);

  if (user.loginType !== LoginType.hbauth) return null;
  if (lockState !== 'locked') return <SessionTimeNote className={className} />;
  return (
    <span className={cn('flex items-center gap-1', className)} data-testid="safe-storage-locked-note">
      <Icons.lock className="h-3 w-3 shrink-0" aria-hidden />
      {t('session_time.locked_note')}
    </span>
  );
};

export default SafeStorageSessionNote;
