import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccountPageMetadata } from '@/wallet/lib/account-page-metadata';
import PermissionsPage from './permissions-page';

interface PageProps {
  params: Promise<{ param: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  return getAccountPageMetadata(params.param, 'Permissions');
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    notFound();
  }

  return <PermissionsPage username={param.replace('@', '')} />;
}
