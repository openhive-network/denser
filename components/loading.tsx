import { TraceSpinner } from 'react-spinners-kit';

const Loading = ({ loading } : any ) => {
  return (
    <div className="flex h-full w-full items-center justify-center pt-16">
      <TraceSpinner size={50} frontColor="#dc2626" backColor="#f67173"  loading={loading} />
    </div>
  );
};

export default Loading;
