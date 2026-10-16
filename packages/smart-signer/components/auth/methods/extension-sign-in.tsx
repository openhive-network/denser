/* Sign-in with an injected browser extension, offered above the safe storage form */
import { FC } from 'react';
import { Button } from '@hive/ui';
import { Icons } from '@hive/ui/components/icons';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { LoginType } from '@smart-signer/types/common';
import { InjectedExtensions } from './use-injected-extensions';

export interface ExtensionSignInProps {
  extensions: InjectedExtensions;
  i18nNamespace: string;
  disabled?: boolean;
  onSignIn: (loginType: LoginType.keychain | LoginType.peakvault) => void;
}

export const hasInjectedExtension = ({ keychain, peakvault }: InjectedExtensions) => keychain || peakvault;

const ExtensionSignIn: FC<ExtensionSignInProps> = ({ extensions, i18nNamespace, disabled, onSignIn }) => {
  const { t } = useSharedTranslation(i18nNamespace);

  return (
    <div className="space-y-2" data-testid="extension-sign-in">
      {extensions.keychain && (
        <Button
          className="w-full"
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onSignIn(LoginType.keychain)}
          data-testid="extension-sign-in-keychain-button"
        >
          <Icons.hivekeychain className="mr-2 h-5 w-5" />
          {t('login_form.extension_sign_in.keychain')}
        </Button>
      )}
      {extensions.peakvault && (
        <Button
          className="w-full"
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onSignIn(LoginType.peakvault)}
          data-testid="extension-sign-in-peakvault-button"
        >
          <Icons.peakvault className="mr-2 h-5 w-5" />
          {t('login_form.extension_sign_in.peakvault')}
        </Button>
      )}
      <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('login_form.extension_sign_in.or_safe_storage')}
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
};

export default ExtensionSignIn;
