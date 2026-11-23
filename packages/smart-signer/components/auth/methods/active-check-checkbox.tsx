/* The choice, when a safe-storage wallet is created, to be asked before every active-key operation */
import { FC, useId } from 'react';
import { Checkbox } from '@hive/ui';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';

export interface ActiveCheckCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const ActiveCheckCheckbox: FC<ActiveCheckCheckboxProps> = ({ checked, onCheckedChange }) => {
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE);
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="flex items-start space-x-2" data-testid="active-check">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(state) => onCheckedChange(state === true)}
        aria-describedby={hintId}
        data-testid="active-check-checkbox"
      />
      <div className="space-y-1">
        <label
          htmlFor={id}
          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {t('login_form.signin_safe_storage.active_check')}
        </label>
        <p id={hintId} className="text-xs text-muted-foreground">
          {t('login_form.signin_safe_storage.active_check_hint')}
        </p>
      </div>
    </div>
  );
};

export default ActiveCheckCheckbox;
