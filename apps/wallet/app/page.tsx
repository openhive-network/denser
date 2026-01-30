import { Metadata } from 'next';
import HomePage from './home-page';

export const metadata: Metadata = {
  title: {
    absolute: 'Hive Wallet - Home'
  }
};

export default function Page() {
  return <HomePage />;
}
