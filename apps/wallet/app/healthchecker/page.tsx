import { Metadata } from 'next';
import HealthCheckerWrapper from '@/wallet/components/healthchecker-wrapper';

export const metadata: Metadata = {
  title: {
    absolute: 'Healthchecker'
  },
  openGraph: {
    title: 'Healthchecker',
    description: 'Health checker for wallet APIs'
  }
};

export default function Page() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <HealthCheckerWrapper />
    </div>
  );
}
