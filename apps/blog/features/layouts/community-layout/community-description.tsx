'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import BasePathLink from '@/blog/components/base-path-link';
import ln2list from '@/blog/lib/ln2list';
import { IAccountNotification } from '@transaction/lib/extended-hive.chain';
import { Community } from '@transaction/lib/extended-hive.chain';
import { SubsListDialog } from './subscription-list-dialog';
import { ActivityLogDialog } from '../../activity-log/dialog';
import { Badge } from '@ui/components/badge';
import { useTranslation } from 'next-i18next';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { useEffect, useState } from 'react';
import SubscribeCommunity from '../../../components/subscribe-community';
import NewPost from '../../../components/new-post-button';
import RendererContainer from '../../../components/rendererContainer';
import EditCommunityDialog from '../../community-profile/edit-dialog';
import { Separator } from '@ui/components';
import clsx from 'clsx';

const CommunityDescription = ({
  data,
  subs,
  notificationData,
  username
}: {
  data: Community;
  subs: string[][];
  notificationData: IAccountNotification[] | null | undefined;
  username: string;
}) => {
  const [isSubscribed, setIsSubscribed] = useState(() => data.context.subscribed);
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const userRole = data.team.find((e) => e[0] === user.username);
  const adminRole = data.team.find((e) => e[0] === user.username && e[1] === 'admin');
  const userCanModerate = data.team.find((e) => e[0] === user.username);
  useEffect(() => {
    setIsSubscribed(data.context.subscribed);
  }, [data.context.subscribed]);
  return (
    <div className="flex w-full max-w-[240px] flex-col">
      <Card
        className={clsx('my-4 hidden h-fit w-auto flex-col px-4 text-primary dark:bg-background md:flex', {
          'animate-pulse': data._temporary
        })}
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
            <SubsListDialog
              community={username}
              title={data.title}
              subs={subs}
              moderateEnabled={Boolean(userCanModerate)}
            >
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
              community={data.name}
              isSubscribed={isSubscribed}
              onIsSubscribed={(e) => setIsSubscribed(e)}
              communityTitle={data.title}
              temprary={data.context._temporary}
            />
            <NewPost name={data.name} disabled={!isSubscribed} />
          </div>
          <div data-testid="community-leadership" className="my-6 flex flex-col">
            <h6 className="my-1.5 font-semibold leading-none tracking-tight">
              {t('communities.titles.leadership')}
            </h6>
            <div className="flex items-center gap-1 self-end">
              {userRole ? (
                <BasePathLink href={`/roles/${username}`} className="text-sm text-destructive">
                  {t('communities.edit_roles')}
                </BasePathLink>
              ) : null}
              {adminRole ? (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  <EditCommunityDialog data={data} />
                </>
              ) : null}
            </div>
            <ul className="mt-1.5 text-xs">
              {data.team.slice(1).map((member: string[]) => (
                <li key={member[0]} className="pt-0.5">
                  <BasePathLink href={`/@${member[0]}`} className="text-destructive hover:cursor-pointer">
                    @{member[0]}
                  </BasePathLink>{' '}
                  <span className="text-[10px] text-slate-500">{member[1].toUpperCase()}</span>{' '}
                  {member[2] && member[2] !== '' ? (
                    <Badge variant="outline" className="ml-0.5 border-destructive py-0">
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
        className={clsx('my-4 hidden h-fit w-auto flex-col px-4 text-primary dark:bg-background md:flex', {
          'animate-pulse': data._temporary
        })}
        data-testid="community-description-rules-sidebar"
      >
        <CardContent className="py-4">
          <div data-testid="community-description">
            <h6 className="my-1.5 font-semibold leading-none tracking-tight">
              {t('communities.titles.description')}
            </h6>

            <RendererContainer
              body={data.description}
              dataTestid="community-description-content"
              author=""
              communityDescription={true}
            />
          </div>

          {data.flag_text.trim() !== '' ? (
            <div data-testid="community-rules" className="my-6">
              <h6 className="my-1.5 font-semibold leading-none tracking-tight">
                {t('communities.titles.rules')}
              </h6>
              <div
                className="preview-rules prose-sm whitespace-normal break-words"
                data-testid="community-rules-content"
              >
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
