import { useEffect, useRef } from 'react';
import { Link } from '@hive/ui';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/wallet/i18n/client';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

type WalletTab = {
  path: string;
  labelKey: string;
  testId: string;
  ownerOnly: boolean;
};

const WALLET_TABS: WalletTab[] = [
  {
    path: 'transfers',
    labelKey: 'navigation.wallet_nav.balances',
    testId: 'wallet-balances-link',
    ownerOnly: false
  },
  {
    path: 'delegations',
    labelKey: 'navigation.wallet_nav.delegations',
    testId: 'wallet-delegations-link',
    ownerOnly: false
  },
  {
    path: 'permissions',
    labelKey: 'navigation.wallet_nav.keys_and_permissions',
    testId: 'wallet-permissions-link',
    ownerOnly: true
  },
  {
    path: 'password',
    labelKey: 'navigation.wallet_nav.change_password',
    testId: 'wallet-password-link',
    ownerOnly: true
  },
  {
    path: 'communities',
    labelKey: 'navigation.wallet_nav.communities',
    testId: 'wallet-communities-link',
    ownerOnly: true
  },
  {
    path: 'authorities',
    labelKey: 'navigation.wallet_nav.authorities',
    testId: 'wallet-authorities-link',
    ownerOnly: true
  }
];

// Each wallet page renders its own WalletMenu, so switching tabs remounts the menu and
// drops focus to <body>. This survives the remount and tells the new menu to restore focus.
let focusActiveTabOnMount = false;

export default function WalletMenu({ username }: { username: string }) {
  const pathname = usePathname();
  const { t } = useTranslation('common_wallet');
  const { user } = useUserClient();
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const isOwner = user?.username === username;

  useEffect(() => {
    if (!focusActiveTabOnMount) return;
    focusActiveTabOnMount = false;
    activeTabRef.current?.focus();
  }, []);

  const handleTabClick = () => {
    focusActiveTabOnMount = true;
  };

  return (
    <nav
      aria-label={t('navigation.wallet_nav.label')}
      className="max-w flex w-full flex-wrap gap-6 border-b-2 border-zinc-500 px-4 py-2"
    >
      {WALLET_TABS.filter((tab) => !tab.ownerOnly || isOwner).map((tab) => {
        const href = `/@${username}/${tab.path}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.path}
            ref={isActive ? activeTabRef : undefined}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            onClick={handleTabClick}
            className={clsx(
              isActive
                ? 'font-semibold text-slate-700 dark:text-slate-100'
                : 'hover:text-red-600 dark:hover:text-red-400'
            )}
            data-testid={tab.testId}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
