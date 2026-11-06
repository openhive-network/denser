/* The idle time a safe-storage session locks after, chosen when signing in */
import { FC, useId } from 'react';
import { Label } from '@hive/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { getSessionTimeChoices } from '@ui/lib/session-time-choice';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { formatSessionTime } from '@smart-signer/lib/session-time-text';

export interface SessionTimeSelectProps {
  /** The idle time, in seconds, shown as chosen */
  value: number;
  onChange: (seconds: number) => void;
}

const SessionTimeSelect: FC<SessionTimeSelectProps> = ({ value, onChange }) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE);
  const id = useId();
  const handleValueChange = (selected: string) => onChange(Number(selected));

  return (
    <div className="space-y-1" data-testid="session-time">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-normal">
          {t('session_time.choose_label')}
        </Label>
        <Select value={String(value)} onValueChange={handleValueChange}>
          <SelectTrigger id={id} className="h-8 w-28" data-testid="session-time-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getSessionTimeChoices().map((seconds) => (
              <SelectItem key={seconds} value={String(seconds)} data-testid={`session-time-option-${seconds}`}>
                {formatSessionTime(t, seconds)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground" data-testid="session-time-caption" data-seconds={value}>
        {t('session_time.locks_after_sentence', { duration: formatSessionTime(t, value) })} {t('session_time.activity')}
      </p>
    </div>
  );
};

export default SessionTimeSelect;
