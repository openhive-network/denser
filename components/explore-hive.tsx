import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FC } from 'react';
import Link from 'next/link';
import { Icons } from '@/components/icons';

const ExploreHive: FC = () => {
  return (
    <Card
      className={cn('my-4 hidden h-fit w-auto flex-col px-8 dark:bg-background/95 dark:text-white md:flex')}
      data-testid="card-explore-hive"
    >
      <CardHeader className="px-0 py-4">
        <CardTitle>Explore Hive</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 pb-4 font-light">
          <li>
            <Link
              href="https://hive.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              What is Hive?
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
          <li>
            <Link
              href="https://hivedapps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              Hive dApps
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
          <li>
            <Link
              href="https://hiveblocks.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              Blockexplorer
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
          <li>
            <Link
              href="https://wallet.hive.blog/~witnesses"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              Vote for Witnesses
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
          <li>
            <Link
              href="https://wallet.hive.blog/proposals"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-red-600 hover:cursor-pointer"
            >
              Hive Proposals
              <Icons.externalLink className="ml-1 h-4 w-4 text-black" />
            </Link>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default ExploreHive;
