'use client';

import { useEffect, useState } from 'react';
import VotesComponent from './votes-component';
import { Entry } from '@transaction/lib/extended-hive.chain';

const VotesComponentWrapper = ({ post, type }: { post: Entry; type: 'comment' | 'post' }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center gap-1">
        <div className="h-[18px] w-[18px] rounded-xl bg-background-secondary" />
        <div className="h-[18px] w-[18px] rounded-xl bg-background-secondary" />
      </div>
    );
  }

  return <VotesComponent post={post} type={type} />;
};

export default VotesComponentWrapper;

