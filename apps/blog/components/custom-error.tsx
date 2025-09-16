import { FC } from 'react';
import Link from 'next/link';
import { Icons } from '@ui/components/icons';
import { useTranslation } from '@/blog/i18n/client';

const CustomError: FC = () => {
  const { t } = useTranslation('common_blog');

  return (
    <div className="mx-auto flex flex-col items-center py-8">
      <Icons.hive className="h-16 w-16" />
      <h3 className="py-4 text-lg">{t('four_oh_four.this_page_does_not_exist')}</h3>
      <div className="text-md py-2">
        {t('four_oh_four.not_to_worry')}{' '}
        <Link href="/" className="text-blue-500 hover:cursor-pointer">
          {t('four_oh_four.our_homepage')}
        </Link>
      </div>
      <div className="flex gap-2 py-2">
        <Link href="/created" className="text-blue-500 hover:cursor-pointer">
          {t('four_oh_four.new_posts')}
        </Link>
        <Link href="/hot" className="text-blue-500 hover:cursor-pointer">
          {t('four_oh_four.hot_posts')}
        </Link>
        <Link href="/trending" className="text-blue-500 hover:cursor-pointer">
          {t('four_oh_four.trending_posts')}
        </Link>
        <Link href="/muted" className="text-blue-500 hover:cursor-pointer">
          {t('four_oh_four.muted_posts')}
        </Link>
      </div>
    </div>
  );
};

export default CustomError;
