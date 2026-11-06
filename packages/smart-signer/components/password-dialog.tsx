'use client';

import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import { ReactNode, useEffect, useId, useState, FC } from 'react';
import { create, InstanceProps } from 'react-modal-promise';
import { SignedOutError } from '@transaction/lib/signed-out';
import { subscribeLogout } from '@smart-signer/lib/auth/logout-notice';
import { subscribeAccountsChanged } from '@smart-signer/lib/auth/account-sync';
import { getUser } from '@smart-signer/lib/auth/user-localstore';
import {
  PasswordForm,
  PasswordFormSchemaHbauth,
  PasswordFormSchemaWif,
  PasswordFormOptions,
  passwordFormDefaultValuesWif
} from '@smart-signer/components/password-form';

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
  const titleId = useId();

  // A sign-out, here or in another tab, closes the dialog: the key it asks for is no longer of a signed-in user
  useEffect(() => {
    const unsubscribe = subscribeLogout(() => onReject(new SignedOutError()));
    return () => {
      unsubscribe();
    };
  }, [onReject]);

  // So does an account switch in another tab: the key is no longer of the user signed in as it opened.
  // A dialog opened by a sign-in, before any user is stored, stays open.
  useEffect(() => {
    const { isLoggedIn, username } = getUser();
    if (!isLoggedIn) return;
    return subscribeAccountsChanged(() => {
      const storedUser = getUser();
      if (!storedUser.isLoggedIn || storedUser.username !== username) onReject(new SignedOutError());
    });
  }, [onReject]);

  const onSubmit = async (data: PasswordFormSchemaHbauth | PasswordFormSchemaWif) => {
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

  const onCancel = () => {
    setOpen(false);
    onReject('rejected');
  };

  const onInteractOutside = (e: any) => {
    e.preventDefault();
  };

  const { mode, showInputStorePassword, validatePassword, i18nKeysForCaptions, i18nValues, showSessionTime } =
    passwordFormOptions;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-[600px]"
        aria-labelledby={titleId}
        onInteractOutside={onInteractOutside}
      >
        <PasswordForm
          onSubmit={onSubmit}
          onCancel={onCancel}
          errorMessage={errorMsg}
          mode={mode}
          showInputStorePassword={showInputStorePassword}
          validatePassword={validatePassword}
          i18nKeysForCaptions={i18nKeysForCaptions}
          i18nValues={i18nValues}
          titleId={titleId}
          showSessionTime={showSessionTime}
        />
      </DialogContent>
    </Dialog>
  );
};

export const PasswordDialogModalPromise = create(PasswordDialog);
