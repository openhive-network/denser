import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import { ReactNode, useState, FC } from 'react';
import { useTranslation } from 'next-i18next';
import { create, InstanceProps } from 'react-modal-promise';
import { PasswordForm, PasswordFormSchema, PasswordFormCaptions } from '@smart-signer/components/password-form';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

interface DialogWifProps {
  children?: ReactNode;
  formCaptions?: PasswordFormCaptions;
  i18nNamespace?: string;
}

export const DialogWif: FC<DialogWifProps & InstanceProps<unknown>> = ({
  children,
  isOpen = false,
  onResolve,
  onReject,
  formCaptions = {},
  i18nNamespace = 'smart-signer'
}) => {
  const { t } = useTranslation(i18nNamespace);
  const [open, setOpen] = useState(isOpen);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const onSubmit = async (data: PasswordFormSchema) => {
    logger.info('onSubmit form data', data);
    const { password } = data;
    setErrorMsg('');
    setPassword(password);
    setOpen(false);
    onResolve(password);
  };

  const onOpenChange = (value: boolean) => {
    setOpen(value);
    if (password) {
      onResolve(password);
    } else {
      onReject('rejected');
    }
  };

  const onInteractOutside = (e: any) => {
    e.preventDefault();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={onInteractOutside}>
        <PasswordForm
          onSubmit={onSubmit}
          errorMessage={errorMsg}
          formCaptions={formCaptions}
        />
      </DialogContent>
    </Dialog>
  );
};

export const DialogWifModalPromise = create(DialogWif);
