import { FC } from 'react';
import Link from 'next/link';
import { Icons } from '@ui/components/icons';
import { Activity } from 'lucide-react';

const NoDataError: FC = () => {
  return (
    <div className="mx-auto flex flex-col items-center py-8">
      <Icons.hive className="h-16 w-16" />
      <h3 className="py-4 text-lg">No Data Available</h3>
      <p className="mb-4 text-center text-muted-foreground">There was a problem fetching the data.</p>
      <p className="text-center text-muted-foreground">
        Please check if permlink is correct or the node is running properly.
      </p>
      <Link href="/status/settings" className="mt-4 inline-flex items-center text-primary hover:underline">
        <Activity className="mr-2 h-4 w-4" />
        Check Node Status
      </Link>
    </div>
  );
};

export default NoDataError;
