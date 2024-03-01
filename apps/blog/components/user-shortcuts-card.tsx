import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import { cn } from '@ui/lib/utils';
import { FC } from 'react';

const UserShortcutsCard: FC = () => {
  return (
    <Card
      className={cn('my-4 hidden h-fit w-auto flex-col px-8 dark:bg-background/95 dark:text-white md:flex')}
      data-testid="card-user-shortcuts"
    >
      <CardHeader className="px-0 py-4">
        <CardTitle>Shortcuts</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          <li>All posts</li>
          <li>My friends</li>
          <li>My communities</li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default UserShortcutsCard;
