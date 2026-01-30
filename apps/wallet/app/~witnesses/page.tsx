import { Metadata } from 'next';
import WitnessesPage from './witnesses-page';

export const metadata: Metadata = {
  title: { absolute: 'Hive Wallet - Witnesses' }
};

export default function Page() {
  return <WitnessesPage />;
}
