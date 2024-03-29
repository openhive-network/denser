import { ReactNode, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import SignInForm, { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';

function DialogLogin({ children }: { children: ReactNode }) {
  const signInFormRef = useRef<SignInFormRef>(null);

  function onComplete() {
    // do smth when completed here
  }

  return (
    <Dialog
      modal={true}
      onOpenChange={async (open) => {
        if (!open) {
          await signInFormRef?.current?.cancel();
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="mt-32 max-w-[380px] rounded-md p-0 sm:mt-auto sm:max-w-[450px] sm:px-0"
        data-testid="login-dialog"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SignInForm ref={signInFormRef} preferredKeyTypes={[KeyType.posting]} onComplete={onComplete} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogLogin;
