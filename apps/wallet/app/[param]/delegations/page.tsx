import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccountPageMetadata } from '@/wallet/lib/account-page-metadata';
import DelegationsPage from './delegations-page';

interface PageProps {
  params: Promise<{ param: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  return getAccountPageMetadata(params.param, 'page_titles.delegations');
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    notFound();
  }

  return <DelegationsPage username={param.replace('@', '')} />;
}
