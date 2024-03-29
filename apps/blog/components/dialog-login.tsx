import { ReactNode, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@ui/components/dialog';
import SignInForm, { SignInFormRef } from '@smart-signer/components/auth/form';
import { LoginPanel } from '@smart-signer/components/signin-panel';

// function DialogLogin({ children }: { children: ReactNode }) {
//   const signInFormRef = useRef<SignInFormRef>(null);

//   function onComplete() {
//     // do smth when completed here
//   }

//   return (
//     <Dialog
//     modal={true}
//       onOpenChange={async (open) => {
//         if (!open) {
//           await signInFormRef?.current?.cancel();
//         }
//       }}>
//       <DialogTrigger asChild>{children}</DialogTrigger>
//       <DialogContent className="max-w-[380px] sm:max-w-[450px] p-0 sm:px-0 rounded-md mt-32 sm:mt-auto" data-testid="login-dialog" onInteractOutside={(e) => e.preventDefault()}>
//         <SignInForm ref={signInFormRef} preferredKeyTypes={['posting']} onComplete={onComplete} />
//       </DialogContent>
//     </Dialog>
//   );
// }


function DialogLogin({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]" data-testid="login-dialog">
        <LoginPanel authenticateOnBackend={false} strict={false} />
      </DialogContent>
    </Dialog>
  );
}

export default DialogLogin;
