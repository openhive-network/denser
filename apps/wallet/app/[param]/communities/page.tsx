import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccountMetadata } from '@transaction/lib/metadata';
import CommunitiesPage from './communities-page';

interface PageProps {
  params: { param: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    return {};
  }

  const metadata = await getAccountMetadata(param, 'Create Communities');
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

  // Generate community tag server-side to avoid hydration mismatch
  const initialCommunityTag = `hive-${Math.floor(Math.random() * 100000) + 100000}`;

  return (
    <CommunitiesPage
      username={param.replace('@', '')}
      initialCommunityTag={initialCommunityTag}
    />
  );
}
