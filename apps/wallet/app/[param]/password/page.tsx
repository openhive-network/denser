import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAccountPageMetadata } from '@/wallet/lib/account-page-metadata';
import PasswordPage from './password-page';

interface PageProps {
  params: Promise<{ param: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  return getAccountPageMetadata(params.param, 'page_titles.change_password');
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    notFound();
  }

  return <PasswordPage username={param.replace('@', '')} />;
}
