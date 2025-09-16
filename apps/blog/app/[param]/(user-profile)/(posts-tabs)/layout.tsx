import AccountPostsTabs from '@/blog/features/layouts/account-posts/tabs';
import { ReactNode } from 'react';

const Layout = async ({ children, params }: { children: ReactNode; params: { param: string } }) => {
  return <AccountPostsTabs username={params.param.replace('%40', '')}>{children}</AccountPostsTabs>;
};
export default Layout;
