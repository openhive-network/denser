import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccountMetadata } from '@transaction/lib/metadata';
import CurationRewardsPage from './curation-rewards-page';

interface PageProps {
  params: { param: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!params.param.startsWith('@')) {
    return {};
  }

  const metadata = await getAccountMetadata(params.param, 'Curation Rewards');
  return {
    title: { absolute: metadata.tabTitle },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      images: [metadata.image]
    }
  };
}

export default function Page({ params }: PageProps) {
  if (!params.param.startsWith('@')) {
    notFound();
  }

  return <CurationRewardsPage username={params.param.replace('@', '')} />;
}
