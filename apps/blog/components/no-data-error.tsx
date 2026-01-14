'use client';

import { FC } from 'react';
import { Link } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import { Activity } from 'lucide-react';
import { useTranslation } from '@/blog/i18n/client';

const NoDataError: FC = () => {
  const { t } = useTranslation('common_blog');
  return (
    <div className="mx-auto flex flex-col items-center py-8">
      <Icons.hive className="h-16 w-16" aria-hidden="true" />
      <h3 className="py-4 text-lg">{t('errors.no_data_available')}</h3>
      <p className="mb-4 text-center text-muted-foreground">{t('errors.problem_fetching_data')}</p>
      <p className="text-center text-muted-foreground">
        {t('errors.check_permlink_or_node')}
      </p>
      <Link href="/healthchecker" className="mt-4 inline-flex items-center text-primary hover:underline">
        <Activity className="mr-2 h-4 w-4" aria-hidden="true" />
        {t('errors.check_node_status')}
      </Link>
    </div>
  );
};

export default NoDataError;
