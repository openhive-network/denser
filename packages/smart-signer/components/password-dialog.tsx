'use client';

import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import { ReactNode, useState, FC } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import {
  PasswordForm,
  PasswordFormSchemaHbauth,
  PasswordFormSchemaWif,
  PasswordFormOptions,
  passwordFormDefaultValuesWif
} from '@smart-signer/components/password-form';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('app');

interface PasswordDialogProps {
  children?: ReactNode;
  passwordFormOptions?: PasswordFormOptions;
}

export const PasswordDialog: FC<PasswordDialogProps & InstanceProps<unknown>> = ({
  children,
  isOpen = false,
  onResolve,
  onReject,
  passwordFormOptions = {}
}) => {
  const [open, setOpen] = useState(isOpen);
  const [password, setPassword] = useState('');
  const [formData, setFormData] = useState<PasswordFormSchemaHbauth | PasswordFormSchemaWif>(
    passwordFormDefaultValuesWif
  );
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = async (data: PasswordFormSchemaHbauth | PasswordFormSchemaWif) => {
    logger.info('onSubmit form data', data);
    const { password } = data;
    setErrorMsg('');
    setPassword(password);
    setFormData(data);
    setOpen(false);
    onResolve(data);
  };

  const onOpenChange = (value: boolean) => {
    setOpen(value);
    if (password) {
      onResolve(formData);
    } else {
      onReject('rejected');
    }
  };

  const onInteractOutside = (e: any) => {
    e.preventDefault();
  };

  const { mode, showInputStorePassword, i18nKeysForCaptions } = passwordFormOptions;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={onInteractOutside}>
        <PasswordForm
          onSubmit={onSubmit}
          errorMessage={errorMsg}
          mode={mode}
          showInputStorePassword={showInputStorePassword}
          i18nKeysForCaptions={i18nKeysForCaptions}
        />
      </DialogContent>
    </Dialog>
  );
};

export const PasswordDialogModalPromise = create(PasswordDialog);
