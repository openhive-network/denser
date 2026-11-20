import { joinSentences } from '@ui/lib/locale-format';

const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_MINUTE = 60;

type Translate = (key: string, options: { value: number }) => string;
type CaptionTranslate = (key: string, options?: { value?: number; duration?: string }) => string;

/** `seconds` as the smart-signer text of an idle time: in whole hours, else whole minutes, else seconds */
export function formatSessionTime(t: Translate, seconds: number): string {
  if (seconds % SECONDS_PER_HOUR === 0) return t('session_time.hours', { value: seconds / SECONDS_PER_HOUR });
  if (seconds % SECONDS_PER_MINUTE === 0) return t('session_time.minutes', { value: seconds / SECONDS_PER_MINUTE });
  return t('session_time.seconds', { value: seconds });
}

/** The caption of an idle time choice: when the session locks, then what restarts the timer, in `lang` */
export function sessionTimeCaption(t: CaptionTranslate, seconds: number, lang: string): string {
  return joinSentences(
    [t('session_time.locks_after_sentence', { duration: formatSessionTime(t, seconds) }), t('session_time.activity')],
    lang
  );
}
