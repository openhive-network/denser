import AccountPostsTabs from '@/blog/features/layouts/account-posts/tabs';
import { ReactNode } from 'react';
import { postAuthorKind } from '@/blog/features/lite-account/lite-did';
import { extractUsernameFromParam } from '@/blog/utils/validate-links';

const Layout = async (props: { children: ReactNode; params: Promise<{ param: string }> }) => {
  const params = await props.params;

  const {
    children
  } = props;

  const username = extractUsernameFromParam(params.param) ?? params.param;
  // A lite account's Posts and Comments are tabs of its profile, without a Payouts one.
  if (postAuthorKind(username) === 'lite') return <>{children}</>;

  return <AccountPostsTabs username={username}>{children}</AccountPostsTabs>;
};
export default Layout;
