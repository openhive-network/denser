import { Metadata } from 'next';
import MarketPage from './market-page';

export const metadata: Metadata = {
  title: {
    absolute: 'Hive Wallet - Market'
  }
};

export default function Page() {
  return <MarketPage />;
}
