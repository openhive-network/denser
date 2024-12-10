import ProfileLayout from '@/blog/components/common/profile-layout';
import { ReactNode } from 'react';

const Layout = ({ children }: { children: ReactNode }) => {
  return <ProfileLayout>{children}</ProfileLayout>;
};

export default Layout;
