import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import { LoginPanel } from '@smart-signer/components/login-panel';
import { ReactNode } from 'react';

function DialogLogin({ children }: { children: ReactNode }) {
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
