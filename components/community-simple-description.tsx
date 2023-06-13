import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const CommunitySimpleDescription = ({ data }: { data: any }) => {
  return (
    <Card
      className="my-4 grid h-fit w-auto grid-cols-3 gap-4 p-2 dark:bg-background/95 dark:text-white"
      data-testid="community-simple-description-sidebar"
    >
      <CardHeader className="col-span-2 p-0">
        <CardTitle>{data.title}</CardTitle>
        <div className="flex text-sm text-gray-500">
          <div className="flex flex-col items-center" data-testid="community-simple-subscribers">
            {data.subscribers} subscribers
          </div>
          <span className="mx-1">•</span>
          <div className="flex flex-col items-center" data-testid="community-simple-active-posters">
            {data.num_authors} active
          </div>
        </div>
        <span className="text-sm" data-testid="short-community-description">
          {data.about}
        </span>
      </CardHeader>
      <CardContent className="col-span-1 flex items-center justify-center p-0">
        <div className="my-4 flex flex-col gap-4">
          <Button
            size="sm"
            className="w-full bg-blue-800 text-center hover:bg-blue-900"
            data-testid="community-simple-subscribe-button"
          >
            <Link href={`/communities`}>Subscribe</Link>
          </Button>

          <Button
            size="sm"
            className="w-full bg-blue-800 text-center hover:bg-blue-900"
            data-testid="community-new-post-button"
          >
            <Link href={`/communities`}>New Post</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunitySimpleDescription;
