'use client';

import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import { FC } from 'react';
import Link from 'next/link';
import { Icons } from '@ui/components/icons';
import { envData } from '../lib/env';
import { useTranslation } from '../i18n/client';

const ExploreHive: FC = () => {
  const { t } = useTranslation('common_blog');
  const walletHost = envData.NEXT_PUBLIC_WALLET_DOMAIN;
  return (
    <Card
      className={cn('my-4 hidden h-fit w-auto flex-col bg-background px-8 text-primary md:flex')}
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
              className="flex items-center hover:text-destructive"
            >
              {t('navigation.explore_nav.what_is_hive')}
              <Icons.externalLink className="ml-1 h-4 w-4" />
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
              <Icons.externalLink className="ml-1 h-4 w-4" />
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
              <Icons.externalLink className="ml-1 h-4 w-4" />
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
              <Icons.externalLink className="ml-1 h-4 w-4" />
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
              <Icons.externalLink className="ml-1 h-4 w-4" />
            </Link>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default ExploreHive;
