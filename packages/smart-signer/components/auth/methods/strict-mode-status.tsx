/* Direct Authority Mode a stored safe storage key unlocks with, read-only */
import { FC } from 'react';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import MethodInfo from '../method-info';

export interface StrictModeStatusProps {
  strict: boolean;
  i18nNamespace: string;
}

const StrictModeStatus: FC<StrictModeStatusProps> = ({ strict, i18nNamespace }) => {
  const { t } = useSharedTranslation(i18nNamespace);

  return (
    <div className="flex items-center space-x-2 text-sm" data-testid="strict-mode-status">
      <span data-testid="strict-mode-status-value" data-strict={strict}>
        {strict
          ? t('login_form.signin_safe_storage.strict_mode_status_on')
          : t('login_form.signin_safe_storage.strict_mode_status_off')}{' '}
        <span className="text-xs text-muted-foreground">{t('login_form.signin_safe_storage.strict_mode_scope')}</span>
      </span>
      <MethodInfo
        label={t('login_form.method_info.label', { method: t('login_form.signin_safe_storage.strict_mode') })}
        info={t('login_form.signin_safe_storage.strict_mode_tooltip')}
        testId="strict-mode-info"
      />
    </div>
  );
};

export default StrictModeStatus;
