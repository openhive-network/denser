import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import AuthForm from '@smart-signer/components/auth/form';

function DialogLogin({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[450px]" data-testid="login-dialog">
        <AuthForm />
      </DialogContent>
    </Dialog>
  );
}

export default DialogLogin;
