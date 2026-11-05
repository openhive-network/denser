import { Icons } from '@ui/components/icons';
import { LoginType } from '@smart-signer/types/common';

const LoginMethodIcon = ({ loginType }: { loginType: LoginType }) => {
  switch (loginType) {
    case LoginType.google:
      return <Icons.google className="h-4 w-4" />;
    case LoginType.keychain:
      return <Icons.hivekeychain className="h-4 w-4" />;
    case LoginType.peakvault:
      return <Icons.peakvault className="h-4 w-4" />;
    case LoginType.metamask:
      return <Icons.metamask className="h-4 w-4" />;
    case LoginType.hiveauth:
      return <Icons.hiveauth className="h-4 w-4" />;
    case LoginType.hivesigner:
      return <Icons.hivesigner className="h-4 w-4" />;
    case LoginType.hbauth:
    case LoginType.wif:
    default:
      return <Icons.keyRound className="h-4 w-4" />;
  }
};

export default LoginMethodIcon;
