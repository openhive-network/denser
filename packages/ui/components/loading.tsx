'use client';

import clsx from 'clsx';
import { TraceSpinner } from 'react-spinners-kit';

const Loading = ({ loading, className }: { loading: boolean; className?: string }) => {
  return (
    <div className={clsx('flex h-full w-full items-center justify-center pt-16', className)}>
      <TraceSpinner size={50} frontColor="#dc2626" backColor="#f67173" loading={loading} />
    </div>
  );
};

export default Loading;
