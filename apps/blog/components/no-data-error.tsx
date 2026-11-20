'use client';

import { FC } from 'react';
import { Link } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import { Activity } from 'lucide-react';
import { useTranslation } from '@/blog/i18n/client';

const NoDataError: FC = () => {
  const { t } = useTranslation('common_blog');
  return (
    <div className="mx-auto flex flex-col items-center py-8" data-testid="no-data-error">
      <Icons.hive className="h-16 w-16" />
      <h3 className="py-4 text-lg">{t('global.no_data_available')}</h3>
      <p className="mb-4 text-center text-muted-foreground">{t('global.fetching_data_failed')}</p>
      <p className="text-center text-muted-foreground">{t('global.check_permlink_or_node')}</p>
      <Link href="/healthchecker" className="mt-4 inline-flex items-center text-primary hover:underline">
        <Activity className="mr-2 h-4 w-4" />
        {t('user_profile.check_node_status')}
      </Link>
    </div>
  );
};

export default NoDataError;
