'use client';

import clsx from 'clsx';
import { Icons } from './icons';

const Loading = ({ loading, className }: { loading: boolean; className?: string }) => {
  if (!loading) return null;

  return (
    <div className={clsx('flex h-full w-full items-center justify-center pt-16', className)}>
      <Icons.spinner className="h-12 w-12 animate-spin text-red-600" />
    </div>
  );
};

export default Loading;
