import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FC } from 'react';

const ExploreHive: FC = () => {
  return (
    <Card
      className={cn(
        'my-4 hidden h-fit w-[300px] flex-col px-8 dark:bg-background/95 dark:text-white md:flex'
      )}
    >
      <CardHeader>
        <CardTitle>Explore Hive</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          <li>What is Hive?</li>
          <li>Hive dApps</li>
          <li>Block explorer</li>
          <li>Vote for Witnesses</li>
          <li>Hive Proposals</li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default ExploreHive;
