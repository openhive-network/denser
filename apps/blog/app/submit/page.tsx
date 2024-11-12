'use client';

import React from 'react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import Content from './content';

const Page = () => {
  const { user } = useUserClient();
  return <Content username={user.username} editMode={false} sideBySidePreview={true} />;
};

export default Page;
