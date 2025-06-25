import clsx from 'clsx';
import { ImpulseSpinner } from 'react-spinners-kit';

const Loading = ({ loading, className }: { loading: boolean; className?: string }) => {
  return (
    <div className={clsx('flex h-full w-full items-center justify-center pt-16', className)}>
      <ImpulseSpinner size={36} frontColor="#fde047" backColor="#fde047" loading={loading} />
    </div>
  );
};

export default Loading;
