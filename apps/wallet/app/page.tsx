import { Metadata } from 'next';
import HomePage from './home-page';
import { getTranslation } from '@/wallet/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_wallet');
  return {
    title: {
      absolute: `Hive Wallet - ${t('page_titles.home')}`
    }
  };
}

export default function Page() {
  return <HomePage />;
}
