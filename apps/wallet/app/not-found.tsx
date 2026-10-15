import type { Metadata } from 'next';
import NotFoundMessage from '@/wallet/components/not-found-message';
import { getPageNotFoundMetadata } from '@/wallet/lib/account-page-metadata';

export function generateMetadata(): Promise<Metadata> {
  return getPageNotFoundMetadata();
}

export default function NotFound() {
  return <NotFoundMessage />;
}
