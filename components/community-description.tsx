import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ln2list from '@/lib/ln2list';
import { DefaultRenderer } from '@hiveio/content-renderer';

const CommunityDescription = ({ data }: { data: any }) => {
  const renderer = new DefaultRenderer({
    baseUrl: 'https://hive.blog/',
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addNofollowToLinks: true,
    doNotShowImages: false,
    ipfsPrefix: '',
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url: string) => 'https://images.hive.blog/1536x0/' + url,
    usertagUrlFn: (account: string) => '/@' + account,
    hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
    isLinkSafeFn: (url: string) => true
  });

  let post_body_html = null;
  if (data.description) {
    post_body_html = renderer.render(data.description);
  }


  return (
    <Card
      className={cn(
        'my-4 hidden h-fit w-[390px] flex-col px-8 dark:bg-background/95 dark:text-white md:flex'
      )}
      data-testid='community-description-sidebar'
    >
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
        <span className='text-sm' data-testid='short-community-description'>{data.about}</span>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-3 text-sm'>
          <div className='flex flex-col items-center' data-testid='community-subscribers'>
            {data.subscribers}
            <span className='text-center text-xs'>subscribers</span>
          </div>
          <div className='flex flex-col items-center' data-testid='community-pending-rewards'>
            {data.sum_pending}
            <span className='text-center text-xs'>pending rewards</span>
          </div>
          <div className='flex flex-col items-center' data-testid='community-active-posters'>
            {data.num_authors}
            <span className='text-center text-xs'>active posters</span>
          </div>
        </div>
        <div className='my-4 flex flex-col gap-2'>
          <Button size='sm' className='w-full text-center' data-testid='community-subscribe-button'>
            <Link href={`/communities`}>Subscribe</Link>
          </Button>

          <Button size='sm' className='w-full text-center' data-testid='community-new-post-button'>
            <Link href={`/communities`}>New Post</Link>
          </Button>
        </div>
        <div data-testid='community-leadership'>
          <h6 className='font-semibold leading-none tracking-tight my-1.5'>Leadership</h6>
          <ul className='mt-1.5 text-sm'>
            {data.team.slice(1).map((member: any) => (
              <li key={member[0]}>
                <Link href={`/@${member[0]}`} className='hover:text-red-600'>
                  @{member[0]}
                </Link>{' '}
                <span className='text-xs text-slate-500'>{member[1].toUpperCase()}</span>{' '}
              </li>
            ))}
          </ul>
        </div>

        <div data-testid='community-description'>
          <h6 className='font-semibold leading-none tracking-tight my-1.5'>Description</h6>
          {post_body_html ? (
            <div
              className='preview-description prose-sm'
              data-testid='community-description-content'
              dangerouslySetInnerHTML={{ __html: post_body_html }}
            />
          ) : null}

        </div>

        {data.flag_text.trim() !== '' ? (
          <div data-testid='community-rules'>
            <h6 className='font-semibold leading-none tracking-tight my-1.5'>Rules</h6>
            <div className='preview-rules prose-sm' data-testid='community-rules-content'>
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
