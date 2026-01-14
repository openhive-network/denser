import { cn } from '@ui/lib/utils';
import { FC } from 'react';
import { Link } from '@hive/ui';
import { Icons } from '@ui/components/icons';

import env from '@beam-australia/react-env';
import { useTranslation } from '../../i18n/client';

const ExploreHive: FC = () => {
  const { t } = useTranslation('common_blog');
  const walletHost = env('WALLET_ENDPOINT');
  return (
    <nav
      aria-label={t('navigation.explore_nav.explore_hive')}
      className={cn('my-4 hidden h-fit w-auto flex-col rounded-md border bg-card px-8 text-primary shadow-sm md:flex')}
      translate="no"
    >
      <div className="px-0 py-4">
        <h2 className="text-lg font-semibold leading-none tracking-tight">{t('navigation.explore_nav.explore_hive')}</h2>
      </div>
      <div className="p-6 pt-0">
        <ul className="space-y-1 pb-4 font-light">
          <li>
            <Link
              href="https://hive.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:text-destructive"
            >
              {t('navigation.explore_nav.what_is_hive')}
              <Icons.externalLink className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link
              href="https://hivedapps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:text-destructive"
            >
              {t('navigation.explore_nav.hive_dapps')}
              <Icons.externalLink className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link
              href="https://hiveblocks.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:text-destructive"
            >
              {t('navigation.explore_nav.blockexplorer')}
              <Icons.externalLink className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link
              href={`${walletHost}/~witnesses`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:text-destructive"
            >
              {t('navigation.explore_nav.vote_for_witnesses')}
              <Icons.externalLink className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </li>
          <li>
            <Link
              href={`${walletHost}/proposals`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:text-destructive"
            >
              {t('navigation.explore_nav.hive_proposals')}
              <Icons.externalLink className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default ExploreHive;
