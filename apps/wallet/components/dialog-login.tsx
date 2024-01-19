import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';
import { ReactNode } from 'react';
import { useTranslation } from 'next-i18next';
import { LoginPanel } from '@smart-signer/components/login-panel';

function DialogLogin({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common_wallet');
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="login-dialog">
        <LoginPanel />
      </DialogContent>
    </Dialog>
  );
}

export default DialogLogin;
