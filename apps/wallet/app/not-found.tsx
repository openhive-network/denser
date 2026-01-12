'use client';

import { Icons } from '@ui/components/icons';
import { Link } from '@hive/ui';
import { useTranslation } from '@/wallet/i18n/client';

export default function NotFound() {
  const { t } = useTranslation('common_wallet');

  return (
    <div className="mx-auto flex flex-col items-center py-8">
      <Icons.hive className="h-16 w-16" />
      <h3 className="py-4 text-lg">{t('four_oh_four.this_page_does_not_exist')}</h3>
      <p className="text-md py-2">
        {t('four_oh_four.not_to_worry')}{' '}
        <Link href="/" className="text-blue-500 hover:cursor-pointer">
          {t('four_oh_four.our_homepage')}
        </Link>
      </p>
    </div>
  );
}
