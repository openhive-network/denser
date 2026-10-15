import { Metadata } from 'next';
import HealthCheckerWrapper from '@/wallet/components/healthchecker-wrapper';
import { getTranslation } from '@/wallet/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation('common_wallet');
  const title = t('page_titles.healthchecker');
  return {
    title: {
      absolute: title
    },
    openGraph: {
      title,
      description: 'Health checker for wallet APIs'
    }
  };
}

export default function Page() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <HealthCheckerWrapper />
    </div>
  );
}
