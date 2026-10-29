/* Direct Authority Mode checkbox of the safe storage forms */
import { FC } from 'react';
import { Checkbox } from '@hive/ui';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import MethodInfo from '../method-info';

export interface StrictModeCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  i18nNamespace: string;
}

/**
 * The option only changes which key safe storage registers, so its label carries a "safe storage
 * only" scope: the form also offers extension sign-ins, which it does not affect.
 */
const StrictModeCheckbox: FC<StrictModeCheckboxProps> = ({ checked, onCheckedChange, i18nNamespace }) => {
  const { t } = useSharedTranslation(i18nNamespace);

  return (
    <div className="flex items-center space-x-2" data-testid="strict-mode">
      <Checkbox
        id="strict"
        checked={checked}
        onCheckedChange={(state) => onCheckedChange(state === true)}
        data-testid="strict-mode-checkbox"
      />
      <label
        htmlFor="strict"
        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {t('login_form.signin_safe_storage.strict_mode')}{' '}
        <span className="text-xs text-muted-foreground" data-testid="strict-mode-scope">
          {t('login_form.signin_safe_storage.strict_mode_scope')}
        </span>
      </label>
      <MethodInfo
        label={t('login_form.method_info.label', { method: t('login_form.signin_safe_storage.strict_mode') })}
        info={t('login_form.signin_safe_storage.strict_mode_tooltip')}
        testId="strict-mode-info"
      />
    </div>
  );
};

export default StrictModeCheckbox;
