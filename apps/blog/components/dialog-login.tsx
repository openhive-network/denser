'use client';

import { ReactNode, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@ui/components/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import dynamic from 'next/dynamic';
import type { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';
import { siteConfig } from '@ui/config/site';

// The sign-in form brings the signers, wax and the form validation: load it when the dialog opens.
const SignInForm = dynamic(() => import('@smart-signer/components/auth/form'), { ssr: false });

const GOOGLE_GSI_SCRIPT_ID = 'google-gsi-script';
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface DialogLoginProps {
  /** The trigger; omit it to open the dialog only through `open` */
  children?: ReactNode;
  redirectTo?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function DialogLogin({ children, redirectTo, open, onOpenChange }: DialogLoginProps) {
  const signInFormRef = useRef<SignInFormRef>(null);
  const router = useRouter();

  async function onComplete(_username: string) {
    onOpenChange?.(false);
    if (redirectTo) {
      router.push(redirectTo);
    }
  }

  // Load Google Sign-In script on demand when dialog opens
  const loadGoogleScript = useCallback(() => {
    if (!siteConfig.googleDrive.clientId) return;
    if (typeof document === 'undefined') return;
    // Use instanceof to prevent DOM clobbering attacks where user content
    // like `<a id="google-gsi-script">` could shadow a legitimate script element
    const existingElement = document.getElementById(GOOGLE_GSI_SCRIPT_ID);
    if (existingElement instanceof HTMLScriptElement) return;

    const script = document.createElement('script');
    script.id = GOOGLE_GSI_SCRIPT_ID;
    script.src = GOOGLE_GSI_SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Opening through `open` does not report to onOpenChange
  useEffect(() => {
    if (open) loadGoogleScript();
  }, [open, loadGoogleScript]);

  const handleOpenChange = async (isOpen: boolean) => {
    onOpenChange?.(isOpen);
    if (isOpen) {
      loadGoogleScript();
    } else {
      await signInFormRef?.current?.cancel();
    }
  };

  return (
    <Dialog modal={true} open={open} onOpenChange={handleOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent
        className="mt-32 max-w-[380px] rounded-md p-0 sm:mt-auto sm:max-w-[450px] sm:px-0"
        data-testid="login-dialog"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>Sign In</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden>
          <DialogDescription>Sign in to your account using your posting key.</DialogDescription>
        </VisuallyHidden>
        <SignInForm
          ref={signInFormRef}
          preferredKeyTypes={[KeyType.posting]}
          onComplete={onComplete}
          authenticateOnBackend={siteConfig.loginAuthenticateOnBackend}
          strict={!siteConfig.allowNonStrictLogin}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DialogLogin;
