'use client';

import { forwardRef, useState } from 'react';
import { Button } from '@ui/components/button';
import { Icons } from '@ui/components/icons';
import { Input, type InputProps } from '@ui/components/input';
import { cn } from '@ui/lib/utils';
import { useTranslation } from '@/wallet/i18n/client';

type PasswordInputProps = Omit<InputProps, 'type'> & {
  autoComplete: 'current-password' | 'new-password';
};

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(({ className, ...props }, ref) => {
  const { t } = useTranslation('common_wallet');
  const [visible, setVisible] = useState(false);

  const toggleVisible = () => setVisible((prev) => !prev);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn('pr-10', className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        aria-label={t('change_password_page.show_password')}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={toggleVisible}
        className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 p-1 hover:bg-transparent"
      >
        {visible ? <Icons.eyeOff aria-hidden="true" /> : <Icons.eye aria-hidden="true" />}
      </Button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
