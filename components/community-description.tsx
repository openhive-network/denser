import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { renderPostBody } from '@ecency/render-helper';
import ln2list from '@/lib/ln2list';

const CommunityDescription = ({ data }: { data: any }) => {
  return (
    <Card
      className={cn(
        'my-4 hidden h-fit w-[390px] flex-col px-8 dark:bg-background/95 dark:text-white md:flex'
      )}
    >
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
        <span className="text-sm">{data.about}</span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 text-sm">
          <div className="flex flex-col items-center">
            {data.subscribers}
            <span className="text-center text-xs">subscribers</span>
          </div>
          <div className="flex flex-col items-center">
            {data.sum_pending}
            <span className="text-center text-xs">pending rewards</span>
          </div>
          <div className="flex flex-col items-center">
            {data.num_authors}
            <span className="text-center text-xs">active posters</span>
          </div>
        </div>
        <div className="my-4 flex flex-col gap-2">
          <Button size="sm" className="w-full text-center">
            <Link href={`/communities`}>Subscribe</Link>
          </Button>

          <Button size="sm" className="w-full text-center">
            <Link href={`/communities`}>New Post</Link>
          </Button>
        </div>
        <div>
          <h6 className="font-semibold leading-none tracking-tight my-1.5">Leadership</h6>
          <ul className="mt-1.5 text-sm">
            {data.team.slice(1).map((member: any) => (
              <li key={member[0]}>
                <Link href={`/@${member[0]}`} className="hover:text-red-600">
                  @{member[0]}
                </Link>{' '}
                <span className="text-xs text-slate-500">{member[1].toUpperCase()}</span>{' '}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h6 className="font-semibold leading-none tracking-tight my-1.5">Description</h6>
          <div
            className="preview-description prose-sm"
            dangerouslySetInnerHTML={{ __html: renderPostBody(data.description, false) }}
          />
        </div>

        {data.flag_text.trim() !== '' ? (
          <div>
            <h6 className="font-semibold leading-none tracking-tight my-1.5">Rules</h6>
            <div className="preview-rules prose-sm">
              {ln2list(data.flag_text).map((x, i) => (
                <p key={i + 1}>{`${i + 1}. ${x}`}</p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default CommunityDescription;
