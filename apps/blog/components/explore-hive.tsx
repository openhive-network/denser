import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import { FC } from 'react';
import Link from 'next/link';
import { Icons } from '@hive/ui/components/icons';
import { useTranslation } from 'next-i18next';
import env from '@beam-australia/react-env';

const ExploreHive: FC = () => {
  const { t } = useTranslation('common_blog');
  const walletHost = env('WALLET_ENDPOINT');
  return (
    <Card
      className={cn('my-4 hidden h-fit w-auto flex-col px-8 dark:bg-background/95 dark:text-white md:flex')}
      translate="no"
    >
      <CardHeader className="px-0 py-4">
        <CardTitle>{t('navigation.explore_nav.explore_hive')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 pb-4 font-light">
          <li>
            <Link
              href="https://hive.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              {t('navigation.explore_nav.what_is_hive')}
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
          <li>
            <Link
              href="https://hivedapps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              {t('navigation.explore_nav.hive_dapps')}
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
          <li>
            <Link
              href="https://hiveblocks.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              {t('navigation.explore_nav.blockexplorer')}
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
          <li>
            <Link
              href={`${walletHost}/~witnesses`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              {t('navigation.explore_nav.vote_for_witnesses')}
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
          <li>
            <Link
              href={`${walletHost}/proposals`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              {t('navigation.explore_nav.hive_proposals')}
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default ExploreHive;
