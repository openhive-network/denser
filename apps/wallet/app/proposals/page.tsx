import { Metadata } from 'next';
import ProposalsPage from './proposals-page';

export const metadata: Metadata = {
  title: {
    absolute: 'Hive Wallet - Proposals'
  }
};

export default function Page() {
  return <ProposalsPage />;
}
