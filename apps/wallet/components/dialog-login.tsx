import { Dialog, DialogContent, DialogTrigger } from '@hive/ui/components/dialog';
import { ReactNode } from 'react';
import { LoginPanel } from '@smart-signer/components/login-panel';

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
