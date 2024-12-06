'use client';

import React from 'react';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import PostForm from '@/blog/features/post-editor/post-form';

const Page = () => {
  const { user } = useUserClient();
  return <PostForm username={user.username} editMode={false} sideBySidePreview={true} />;
};

export default Page;
