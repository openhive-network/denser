import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ln2list from '@/lib/ln2list';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@/lib/old-profixy';
import { Community, Subscription, getAccountNotifications } from '@/lib/bridge';
import { SubsListDialog } from './subscription-list-dialog';
import { ActivityLogDialog } from './activity-log-dialog';
import { Badge } from '@/components/ui/badge';

const CommunityDescription = ({
  data,
  subs,
  notificationData,
  username
}: {
  data: Community;
  subs: Subscription[];
  notificationData: any;
  username: string;
}) => {
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
    imageProxyFn: (url: string) => getDoubleSize(proxifyImageUrl(url, true).replace(/ /g, '%20')),
    usertagUrlFn: (account: string) => '/@' + account,
    hashtagUrlFn: (hashtag: string) => '/trending/' + hashtag,
    isLinkSafeFn: (url: string) => false
  });

  let post_body_html = null;
  if (data.description) {
    post_body_html = renderer.render(data.description);
  }

  return (
    <div className="flex w-auto flex-col">
      <Card
        className={cn('my-4 hidden h-fit w-auto flex-col px-4 dark:bg-background/95 dark:text-white md:flex')}
        data-testid="community-info-sidebar"
      >
        <CardHeader className="px-0 font-light">
          <CardTitle>{data.title}</CardTitle>
          <span className="text-sm" data-testid="short-community-description">
            {data.about}
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 text-sm">
            <SubsListDialog title={data.title} subs={subs}>
              <div className="flex flex-col items-center" data-testid="community-subscribers">
                {data.subscribers}
                <span className="text-center text-xs">subscribers</span>
              </div>
            </SubsListDialog>
            <div className="flex flex-col items-center" data-testid="community-pending-rewards">
              {data.sum_pending}
              <span className="text-center text-xs">pending rewards</span>
            </div>
            <div className="flex flex-col items-center" data-testid="community-active-posters">
              {data.num_authors}
              <span className="text-center text-xs">active posters</span>
            </div>
          </div>
          <div className="my-4 flex flex-col gap-2">
            <Button
              size="sm"
              className="w-full bg-blue-800 text-center hover:bg-blue-900"
              data-testid="community-subscribe-button"
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
          <div data-testid="community-leadership" className="my-6 flex flex-col">
            <h6 className="my-1.5 font-semibold leading-none tracking-tight">Leadership</h6>
            <ul className="mt-1.5 text-xs">
              {data.team.slice(1).map((member: any) => (
                <li key={member[0]} className="pt-0.5">
                  <Link href={`/@${member[0]}`} className="text-red-600 hover:cursor-pointer">
                    @{member[0]}
                  </Link>{' '}
                  <span className="text-[10px] text-slate-500">{member[1].toUpperCase()}</span>{' '}
                  {member[2] && member[2] !== '' ? (
                    <Badge variant="outline" className="ml-0.5 border-red-600 py-0 text-slate-500">
                      {member[2]}
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="self-end text-sm">
              <ActivityLogDialog username={username} data={notificationData}>
                Activity Log
              </ActivityLogDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn('my-4 hidden h-fit w-auto flex-col px-4 dark:bg-background/95 dark:text-white md:flex')}
        data-testid="community-description-rules-sidebar"
      >
        <CardContent className="py-4">
          <div data-testid="community-description">
            <h6 className="my-1.5 font-semibold leading-none tracking-tight">Description</h6>
            {post_body_html ? (
              <div
                className="preview-description prose-sm "
                data-testid="community-description-content"
                dangerouslySetInnerHTML={{ __html: post_body_html }}
              />
            ) : null}
          </div>

          {data.flag_text.trim() !== '' ? (
            <div data-testid="community-rules" className="my-6">
              <h6 className="my-1.5 font-semibold leading-none tracking-tight">Rules</h6>
              <div className="preview-rules prose-sm" data-testid="community-rules-content">
                {ln2list(data.flag_text).map((x, i) => (
                  <p key={i + 1}>{`${i + 1}. ${x}`}</p>
                ))}
              </div>
            </div>
          ) : null}
          {data.lang ? (
            <div>
              <h6 className="my-1.5 font-semibold leading-none tracking-tight">Language</h6>
              <div className="preview-rules" data-testid="community-rules-content">
                {data.lang}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityDescription;
