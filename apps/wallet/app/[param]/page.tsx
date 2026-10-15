import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getPageNotFoundMetadata } from '@/wallet/lib/account-page-metadata';

export async function generateMetadata(props: { params: Promise<{ param: string }> }): Promise<Metadata> {
  const params = await props.params;
  return decodeURIComponent(params.param).startsWith('@') ? {} : getPageNotFoundMetadata();
}

export default async function Page(props: { params: Promise<{ param: string }> }) {
  const params = await props.params;
  const param = decodeURIComponent(params.param);
  if (!param.startsWith('@')) {
    notFound();
  }
  redirect(`/${param}/transfers`);
}
