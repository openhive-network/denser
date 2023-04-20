import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const CommunitiesListItem = ({ community }: { community: any }) => {
  return (
    <Card
      className={cn(
        'my-4 flex hover:bg-accent hover:text-accent-foreground  dark:bg-background/95 dark:text-white dark:hover:bg-accent dark:hover:text-accent-foreground'
      )}
    >
      <div className="w-4/5">
        <CardHeader>
          <CardTitle>{community.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{community.about}</p>
        </CardContent>
        <CardFooter className="flex flex-col items-start text-sm">
          <p className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
            {community.subscribers} subscribers <span className="mx-1">•</span> {community.num_authors}{' '}
            authors <span className="mx-1">•</span>
            {community.num_pending} posts
          </p>
          {community.admins?.length > 0 ? (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>{community.admins?.length > 1 ? 'admins' : 'admin'}: </span>
              {community.admins.map((admin: any, index: number) => (
                <span key={index} className="text-red-600">
                  {admin} {index !== community.admins.length - 1 ? <span className="mx-1">•</span> : null}
                </span>
              ))}
            </p>
          ) : null}
        </CardFooter>
      </div>
      <div className="flex w-1/5 items-center justify-center">
        <Button>Subscribe</Button>
      </div>
    </Card>
  );
};

export default CommunitiesListItem;
