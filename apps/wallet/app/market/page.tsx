import { Metadata } from 'next';
import MarketPage from './market-page';
import { getTranslation } from '@/wallet/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_wallet');
  return {
    title: {
      absolute: `Hive Wallet - ${t('page_titles.market')}`
    }
  };
}

export default function Page() {
  return <MarketPage />;
}
