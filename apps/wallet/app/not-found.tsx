import type { Metadata } from 'next';
import NotFoundMessage from '@/wallet/components/not-found-message';
import { PAGE_NOT_FOUND_METADATA } from '@/wallet/lib/account-page-metadata';

export const metadata: Metadata = PAGE_NOT_FOUND_METADATA;

export default function NotFound() {
  return <NotFoundMessage />;
}
