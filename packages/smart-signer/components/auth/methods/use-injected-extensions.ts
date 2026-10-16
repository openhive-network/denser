import { useEffect, useState } from 'react';
import { hasCompatibleKeychain } from '@smart-signer/lib/signer/signer-keychain';
import { hasCompatiblePeakvault } from '@smart-signer/lib/signer/signer-peakvault';

/** The signing extensions that inject themselves into the page, and whether each is present. */
export interface InjectedExtensions {
  keychain: boolean;
  peakvault: boolean;
}

const NONE: InjectedExtensions = { keychain: false, peakvault: false };

/** Detects the injected signing extensions once mounted; none are reported before that. */
export function useInjectedExtensions(): InjectedExtensions {
  const [extensions, setExtensions] = useState<InjectedExtensions>(NONE);

  useEffect(() => {
    setExtensions({ keychain: hasCompatibleKeychain(), peakvault: hasCompatiblePeakvault() });
  }, []);

  return extensions;
}
