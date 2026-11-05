/* How long a safe-storage session stays unlocked while idle, read-only */
import { FC } from 'react';
import { useSessionTime } from '@ui/hooks/use-session-time';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { formatSessionTime } from '@smart-signer/lib/session-time-text';

const SessionTimeNote: FC<{ className?: string }> = ({ className }) => {
  // Also rendered in the account menu and for signing, where the namespace may not be loaded yet: don't suspend
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const sessionTime = useSessionTime();

  return (
    <span className={className} data-testid="session-time-note" data-seconds={sessionTime}>
      {t('session_time.locks_after', { duration: formatSessionTime(t, sessionTime) })}
    </span>
  );
};

export default SessionTimeNote;
