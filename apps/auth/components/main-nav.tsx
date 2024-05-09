import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@ui/components/icons';
import { siteConfig } from '@ui/config/site';

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 hidden h-full items-center md:flex">
      {/*
      CSS class `keychainify-checked` exists here on `Link`, because
      enabled Hive Keychain browser extension causes React hydration
      error without that.
      TODO Debug this, make an issue in their repo when needed.
      */}
      <Link href="/" className="keychainify-checked mr-6 flex items-center space-x-2">
        <Icons.hivetoken />
        {siteConfig.chainEnv !== 'mainnet' && <span className="text-xs text-red-600 uppercase">{siteConfig.chainEnv}</span>}
      </Link>
    </div>
  );
}
