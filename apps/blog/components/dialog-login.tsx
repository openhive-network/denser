'use client';

import { ReactNode, useRef, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@ui/components/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import dynamic from 'next/dynamic';
import type { SignInFormRef } from '@smart-signer/components/auth/form';
import { KeyType } from '@smart-signer/types/common';
import { siteConfig } from '@ui/config/site';
import { useTranslation } from '@/blog/i18n/client';
import LiteLoginEntry from '@/blog/features/lite-account/lite-login-entry';

// The sign-in form brings the signers, wax and the form validation: load it when the dialog opens.
const SignInForm = dynamic(() => import('@smart-signer/components/auth/form'), { ssr: false });
const LiteSignInDialog = dynamic(() => import('@/blog/features/lite-account/lite-sign-in-dialog'), {
  ssr: false
});

const GOOGLE_GSI_SCRIPT_ID = 'google-gsi-script';
const GOOGLE_GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface DialogLoginProps {
  /** The trigger; omit it to open the dialog only through `open` */
  children?: ReactNode;
  redirectTo?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The key to sign in with */
  keyType?: KeyType;
  /** The account to sign in; defaults to the last one signed in */
  username?: string;
  /** Opens on the "Passkey signer" sign-in */
  passkey?: boolean;
}

function DialogLogin({
  children,
  redirectTo,
  open,
  onOpenChange,
  keyType = KeyType.posting,
  username,
  passkey = false
}: DialogLoginProps) {
  const { t } = useTranslation('common_blog');
  const signInFormRef = useRef<SignInFormRef>(null);
  const router = useRouter();
  // Uncontrolled (trigger only) the dialog keeps its own state, so it can close itself for the lite sign-in.
  const [ownOpen, setOwnOpen] = useState(false);
  const isOpen = open ?? ownOpen;
  const [isLiteSignInOpen, setIsLiteSignInOpen] = useState(false);
  const handingOffRef = useRef(false);

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

  const handleOpenChange = async (nextOpen: boolean) => {
    setOwnOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (nextOpen) {
      loadGoogleScript();
    } else {
      await signInFormRef?.current?.cancel();
    }
  };

  const openLiteSignIn = () => {
    handingOffRef.current = true;
    setIsLiteSignInOpen(true);
    void handleOpenChange(false);
  };

  // Focus would go back to the trigger, away from the lite sign-in dialog opening in its place.
  const onCloseAutoFocus = (event: Event) => {
    if (!handingOffRef.current) return;
    handingOffRef.current = false;
    event.preventDefault();
  };

  return (
    <>
      <Dialog modal={true} open={isOpen} onOpenChange={handleOpenChange}>
        {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
        <DialogContent
          className="mt-32 max-w-[380px] rounded-md p-0 sm:mt-auto sm:max-w-[450px] sm:px-0"
          data-testid="login-dialog"
          onInteractOutside={(e) => e.preventDefault()}
          onCloseAutoFocus={onCloseAutoFocus}
          closeLabel={t('global.close')}
        >
          <VisuallyHidden>
            <DialogTitle>{t('login_form.dialog_title')}</DialogTitle>
          </VisuallyHidden>
          <VisuallyHidden>
            <DialogDescription>{t('login_form.dialog_description')}</DialogDescription>
          </VisuallyHidden>
          <SignInForm
            ref={signInFormRef}
            preferredKeyTypes={[keyType]}
            username={username}
            passkey={passkey}
            onComplete={onComplete}
            authenticateOnBackend={siteConfig.loginAuthenticateOnBackend}
          />
          <LiteLoginEntry onSignIn={openLiteSignIn} />
        </DialogContent>
      </Dialog>
      {isLiteSignInOpen ? <LiteSignInDialog open onOpenChange={setIsLiteSignInOpen} /> : null}
    </>
  );
}

export default DialogLogin;
