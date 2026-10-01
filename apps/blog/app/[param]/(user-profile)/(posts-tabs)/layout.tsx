import AccountPostsTabs from '@/blog/features/layouts/account-posts/tabs';
import { ReactNode } from 'react';

const Layout = async (props: { children: ReactNode; params: Promise<{ param: string }> }) => {
  const params = await props.params;

  const {
    children
  } = props;

  return <AccountPostsTabs username={params.param.replace('%40', '')}>{children}</AccountPostsTabs>;
};
export default Layout;
