/* How long a safe-storage session stays unlocked while idle, read-only */
import { FC } from 'react';
import { useSessionTime } from '@ui/hooks/use-session-time';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { formatSessionTime, sessionTimeCaption } from '@smart-signer/lib/session-time-text';

interface SessionTimeNoteProps {
  className?: string;
  /** Whether operations needing the active or owner key ask every time, told as the sign-in tells it; omitted, the note tells only the idle time */
  activeCheck?: boolean;
}

const SessionTimeNote: FC<SessionTimeNoteProps> = ({ className, activeCheck }) => {
  // Also rendered in the account menu and for signing, where the namespace may not be loaded yet: don't suspend
  const { t, i18n } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const sessionTime = useSessionTime();

  return (
    <span className={className} data-testid="session-time-note" data-seconds={sessionTime}>
      {activeCheck === undefined
        ? t('session_time.locks_after', { duration: formatSessionTime(t, sessionTime) })
        : sessionTimeCaption(t, sessionTime, i18n.language, activeCheck)}
    </span>
  );
};

export default SessionTimeNote;
