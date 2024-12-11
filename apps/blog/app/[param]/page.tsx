'use client';

import PostBySort from '@/blog/features/landing-page/post-by-sort';
import UserPostList from '@/blog/features/profil-page/post-list';
import { useParams } from 'next/navigation';

const Page = () => {
  const { param: username } = useParams() as {
    param: string;
  };
  const clean_username = username.startsWith('%40');
  return clean_username ? <UserPostList /> : <PostBySort />;
};

export default Page;
