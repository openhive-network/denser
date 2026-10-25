import { notFound } from 'next/navigation';
import { isForYouEnabled } from '@/blog/lib/utils';
import Content from './content';

// FYP_API_URL is read when the server starts, so the route cannot be decided at build time
export const dynamic = 'force-dynamic';

const Page = () => {
  if (!isForYouEnabled) notFound();
  return <Content />;
};

export default Page;
