import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccountMetadata } from '@transaction/lib/metadata';
import AuthorRewardsPage from './author-rewards-page';

interface PageProps {
  params: { param: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    return {};
  }

  const metadata = await getAccountMetadata(param, 'Author Rewards');
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
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    notFound();
  }

  return <AuthorRewardsPage username={param.replace('@', '')} />;
}
