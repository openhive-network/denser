import AccountPostsTabs from '@/blog/features/layouts/account-posts/tabs';
import { ReactNode } from 'react';

const Layout = async ({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ param: string }>;
}) => {
  const { param } = await params;
  return <AccountPostsTabs username={param.replace('%40', '')}>{children}</AccountPostsTabs>;
};
export default Layout;
