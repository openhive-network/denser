import ClientSideLayout from '@/blog/features/layouts/sorts/client-side-layout';
import ServerSideLayout from '@/blog/features/layouts/sorts/server-side-layout';
import { ReactNode } from 'react';

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <ServerSideLayout>
      <ClientSideLayout>{children}</ClientSideLayout>
    </ServerSideLayout>
  );
};
export default Layout;
