import { Link } from '@hive/ui';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';

export default function WalletMenu({ username }: { username: string }) {
  const router = useRouter();
  const { t } = useTranslation('common_wallet');
  const { user } = useUser();
  return (
    <div className="max-w flex w-full flex-wrap gap-6 border-b-2 border-zinc-500 px-4 py-2">
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
      {user?.username === username && (
        <Link
          href={`/@${username}/permissions`}
          className={clsx(
            router.asPath === `/@${username}/permissions`
              ? 'font-semibold text-slate-700 dark:text-slate-100'
              : 'hover:text-red-600 dark:hover:text-red-400'
          )}
        >
          <div className="hover:text-red-600 dark:hover:text-red-400" data-testid="wallet-delegations-link">
            {t('navigation.wallet_nav.keys_and_permissions')}
          </div>
        </Link>
      )}
      {user?.username === username && (
        <Link
          href={`/@${username}/password`}
          className={clsx(
            router.asPath === `/@${username}/password`
              ? 'font-semibold text-slate-700 dark:text-slate-100'
              : 'hover:text-red-600 dark:hover:text-red-400'
          )}
        >
          <div className="hover:text-red-600 dark:hover:text-red-400" data-testid="wallet-delegations-link">
            {t('navigation.wallet_nav.change_password')}
          </div>
        </Link>
      )}
      {user?.username === username && (
        <Link
          href={`/@${username}/communities`}
          className={clsx(
            router.asPath === `/@${username}/communities`
              ? 'font-semibold text-slate-700 dark:text-slate-100'
              : 'hover:text-red-600 dark:hover:text-red-400'
          )}
        >
          <div className="hover:text-red-600 dark:hover:text-red-400" data-testid="wallet-delegations-link">
            {t('navigation.wallet_nav.communities')}
          </div>
        </Link>
      )}
      {user?.username === username && (
        <Link
          href={`/@${username}/authorities`}
          className={clsx(
            router.asPath === `/@${username}/authorities`
              ? 'font-semibold text-slate-700 dark:text-slate-100'
              : 'hover:text-red-600 dark:hover:text-red-400'
          )}
        >
          <div className="hover:text-red-600 dark:hover:text-red-400" data-testid="wallet-delegations-link">
            Authorities
          </div>
        </Link>
      )}
    </div>
  );
}
