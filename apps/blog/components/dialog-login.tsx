import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import AuthForm from '@smart-signer/components/auth/form';

function DialogLogin({ children }: { children: ReactNode }) {
  function onComplete() {
    alert('completed');
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[450px]" data-testid="login-dialog" onInteractOutside={(e) => e.preventDefault()}>
        <AuthForm preferredKeyTypes={['posting']} onComplete={onComplete} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogLogin;
