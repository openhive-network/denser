import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccountMetadata } from '@transaction/lib/metadata';
import RewardsHistoryPage from '@/wallet/feature/rewards-page/rewards-history-page';

interface PageProps {
  params: Promise<{ param: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    return {};
  }

  const metadata = await getAccountMetadata(param, 'Curation Rewards');
  return {
    title: { absolute: metadata.tabTitle },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      images: [metadata.image]
    }
  };
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    notFound();
  }

  return <RewardsHistoryPage username={param.replace('@', '')} rewardType="curation" />;
}
