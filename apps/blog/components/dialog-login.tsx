import { ReactNode, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import SignInForm, { SignInFormRef } from '@smart-signer/components/auth/form';

function DialogLogin({ children }: { children: ReactNode }) {
  const signInFormRef = useRef<SignInFormRef>(null);

  function onComplete() {
    // do smth when completed here
  }

  return (
    <Dialog onOpenChange={async (open) => {
      if (!open) {
        await signInFormRef?.current?.cancel();
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[450px]" data-testid="login-dialog" onInteractOutside={(e) => e.preventDefault()}>
        <SignInForm ref={signInFormRef} preferredKeyTypes={['posting']} onComplete={onComplete} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogLogin;
