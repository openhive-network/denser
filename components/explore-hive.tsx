import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FC } from 'react';
import Link from 'next/link';

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
        <ul className="space-y-1">
          <li>
            <Link
              href="https://hive.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:cursor-pointer"
            >
              What is Hive?
            </Link>
          </li>
          <li>
            <Link
              href="https://hivedapps.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:cursor-pointer"
            >
              Hive dApps
            </Link>
          </li>
          <li>
            <Link
              href="https://hiveblocks.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:cursor-pointer"
            >
              Blockexplorer
            </Link>
          </li>
          <li>
            <Link
              href="https://wallet.hive.blog/~witnesses"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:cursor-pointer"
            >
              Vote for Witnessesv
            </Link>
          </li>
          <li>
            <Link
              href="https://wallet.hive.blog/proposals"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:cursor-pointer"
            >
              Hive Proposals
            </Link>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default ExploreHive;
