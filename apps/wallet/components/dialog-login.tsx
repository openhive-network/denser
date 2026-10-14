import { ReactNode, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import dynamic from 'next/dynamic';
import type { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';

// The sign-in form brings the signers, wax and the form validation: load it when the dialog opens.
const SignInForm = dynamic(() => import('@smart-signer/components/auth/form'), { ssr: false });

interface DialogLoginProps {
  /** The trigger; omit it to open the dialog only through `open` */
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The key to sign in with */
  keyType?: KeyType;
  /** The account to sign in; defaults to the last one signed in */
  username?: string;
}

function DialogLogin({ children, open, onOpenChange, keyType = KeyType.active, username }: DialogLoginProps) {
  const signInFormRef = useRef<SignInFormRef>(null);

  async function onComplete(_username: string) {
    onOpenChange?.(false);
  }

  return (
    <Dialog
      modal={true}
      open={open}
      onOpenChange={async (isOpen) => {
        onOpenChange?.(isOpen);
        if (!isOpen) {
          await signInFormRef?.current?.cancel();
        }
      }}
    >
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent
        className="mt-32 max-w-[380px] rounded-md p-0 sm:mt-auto sm:max-w-[450px] sm:px-0"
        data-testid="login-dialog"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SignInForm
          ref={signInFormRef}
          preferredKeyTypes={[keyType]}
          username={username}
          onComplete={onComplete}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogLogin;
