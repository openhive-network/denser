import Link from 'next/link';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

export default function WalletMenu({ username }: { username: string }) {
  const router = useRouter();
  const { t } = useTranslation('common_wallet');
  const userAfterLogin = true;
  return (
    <div className="flex w-full max-w-6xl gap-6 border-b-2 border-zinc-500 px-4 py-2">
      <Link
        href={`/@${username}/transfers`}
        className={clsx(
          router.asPath === `/@${username}/transfers`
            ? 'font-semibold text-slate-700 dark:text-slate-100'
            : 'hover:text-red-600 dark:hover:text-red-400'
        )}
        data-testid="wallet-balances-link"
      >
        {t('navigation.wallet_nav.balances')}
      </Link>
      <Link
        href={`/@${username}/delegations`}
        className={clsx(
          router.asPath === `/@${username}/delegations`
            ? 'font-semibold text-slate-700 dark:text-slate-100'
            : 'hover:text-red-600 dark:hover:text-red-400'
        )}
      >
        <div className="hover:text-red-600 dark:hover:text-red-400" data-testid="wallet-delegations-link">
          {t('navigation.wallet_nav.delegations')}
        </div>
      </Link>
      {userAfterLogin && (
        <Link
          href={`/@${username}/permissions`}
          className={clsx(
            router.asPath === `/@${username}/permissions`
              ? 'font-semibold text-slate-700 dark:text-slate-100'
              : 'hover:text-red-600 dark:hover:text-red-400'
          )}
        >
          <div className="hover:text-red-600 dark:hover:text-red-400" data-testid="wallet-delegations-link">
            Key & Permissions
          </div>
        </Link>
      )}
      {userAfterLogin && (
        <Link
          href={`/@${username}/password`}
          className={clsx(
            router.asPath === `/@${username}/password`
              ? 'font-semibold text-slate-700 dark:text-slate-100'
              : 'hover:text-red-600 dark:hover:text-red-400'
          )}
        >
          <div className="hover:text-red-600 dark:hover:text-red-400" data-testid="wallet-delegations-link">
            Cange Password
          </div>
        </Link>
      )}
      {userAfterLogin && (
        <Link
          href={`/@${username}/communities`}
          className={clsx(
            router.asPath === `/@${username}/communities`
              ? 'font-semibold text-slate-700 dark:text-slate-100'
              : 'hover:text-red-600 dark:hover:text-red-400'
          )}
        >
          <div className="hover:text-red-600 dark:hover:text-red-400" data-testid="wallet-delegations-link">
            Communities
          </div>
        </Link>
      )}
    </div>
  );
}
