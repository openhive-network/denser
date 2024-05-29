import { cn } from '@ui/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import Link from 'next/link';
import ln2list from '@/blog/lib/ln2list';
import { type Community, type Subscription, IAccountNotification } from '@transaction/lib/bridge';
import { SubsListDialog } from './subscription-list-dialog';
import { ActivityLogDialog } from './activity-log-dialog';
import { Badge } from '@ui/components/badge';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useEffect, useState } from 'react';
import SubscribeCommunity from './subscribe-community';
import NewPost from './new-post-button';
import RendererContainer from './rendererContainer';

const CommunityDescription = ({
  data,
  subs,
  notificationData,
  username
}: {
  data: Community;
  subs: Subscription[];
  notificationData: IAccountNotification[] | null | undefined;
  username: string;
}) => {
  const [isSubscribe, setIsSubscribe] = useState(() => data.context.subscribed);
  const { user } = useUser();
  const { t } = useTranslation('common_blog');

  useEffect(() => {
    setIsSubscribe(data.context.subscribed);
  }, [data.context.subscribed]);
  return (
    <div className="flex w-auto max-w-[240px] flex-col">
      <Card
        className={cn('my-4 hidden h-fit w-auto flex-col px-4 dark:bg-background/95 dark:text-white md:flex')}
        data-testid="community-info-sidebar"
      >
        <CardHeader className="px-0 font-light">
          <CardTitle className="flex items-center gap-1">
            <span>{data.title}</span>
            {data.is_nsfw ? <Badge variant="red">NSFW</Badge> : null}
          </CardTitle>
          <span className="text-sm" data-testid="short-community-description">
            {data.about}
          </span>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <SubsListDialog title={data.title} subs={subs}>
              <div className="flex flex-col items-center" data-testid="community-subscribers">
                {data.subscribers}
                <span className="text-center text-xs">{t('communities.buttons.subscribers')}</span>
              </div>
            </SubsListDialog>
            <div className="flex flex-col items-center" data-testid="community-pending-rewards">
              ${data.sum_pending}
              <span className="text-center text-xs">{t('communities.titles.pending_rewards')}</span>
            </div>
            <div className="flex flex-col items-center" data-testid="community-active-posters">
              {data.num_authors}
              <span className="text-center text-xs">{t('communities.titles.active_posters')}</span>
            </div>
          </div>
          <div className="my-4 flex flex-col gap-2">
            <SubscribeCommunity
              user={user}
              username={username}
              subStatus={isSubscribe}
              OnIsSubscribe={(e) => setIsSubscribe(e)}
            />
            <NewPost name={data.name} disabled={!isSubscribe} />
          </div>
          <div data-testid="community-leadership" className="my-6 flex flex-col">
            <h6 className="my-1.5 font-semibold leading-none tracking-tight">
              {t('communities.titles.leadership')}
            </h6>
            <ul className="mt-1.5 text-xs">
              {data.team.slice(1).map((member: string[]) => (
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
                {t('communities.buttons.activity_log')}
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
            <h6 className="my-1.5 font-semibold leading-none tracking-tight">
              {t('communities.titles.description')}
            </h6>

            <RendererContainer
              body={data.description}
              className="preview-description prose-sm w-[13em] break-words 2xl:w-fit"
              data-testid="community-description-content"
              author=""
              check={false}
            />
          </div>

          {data.flag_text.trim() !== '' ? (
            <div data-testid="community-rules" className="my-6">
              <h6 className="my-1.5 font-semibold leading-none tracking-tight">
                {t('communities.titles.rules')}
              </h6>
              <div className="preview-rules prose-sm" data-testid="community-rules-content">
                {ln2list(data.flag_text).map((x, i) => (
                  <p key={i + 1}>{`${i + 1}. ${x}`}</p>
                ))}
              </div>
            </div>
          ) : null}
          {data.lang ? (
            <div data-testid="community-language">
              <h6 className="my-1.5 font-semibold leading-none tracking-tight">
                {t('communities.titles.language')}
              </h6>
              <div className="preview-rules" data-testid="community-choosen-language">
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
