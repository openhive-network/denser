import { FC } from 'react';
import Link from 'next/link';
import { Icons } from '@hive/ui/components/icons';

const CustomError: FC = () => {
  return (
    <div className="mx-auto flex flex-col items-center py-8">
      <Icons.hive className="h-16 w-16" />
      <h3 className="py-4 text-lg">Sorry! This page does not exist.</h3>
      <p className="text-md py-2">
        Not to worry. You can head back to{' '}
        <Link href="/" className="text-blue-500 hover:cursor-pointer">
          our homepage
        </Link>
        , or check out some great posts.
      </p>

      <div className="flex gap-2 py-2">
        <Link href="/created" className="text-blue-500 hover:cursor-pointer">
          new posts
        </Link>
        <Link href="/hot" className="text-blue-500 hover:cursor-pointer">
          hot posts
        </Link>
        <Link href="/trending" className="text-blue-500 hover:cursor-pointer">
          trending posts
        </Link>
        <Link href="/muted" className="text-blue-500 hover:cursor-pointer">
          muted posts
        </Link>
      </div>
    </div>
  );
};

export default CustomError;
