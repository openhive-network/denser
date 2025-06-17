import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';
import { Community } from '@transaction/lib/extended-hive.chain';
import { IAccountNotification } from '@transaction/lib/extended-hive.chain';
import { SubsListDialog } from './subscription-list-dialog';
import { ActivityLogDialog } from './activity-log-dialog';
import { useTranslation } from 'next-i18next';
import SubscribeCommunity from './subscribe-community';
import { useUser } from '@smart-signer/lib/auth/use-user';
import NewPost from './new-post-button';
import { useEffect, useState } from 'react';
import { Badge, Separator } from '@ui/components';
import Link from 'next/link';
import EditCommunityDialog from './edit-community-dialog';

const CommunitySimpleDescription = ({
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
  const { t } = useTranslation('common_blog');
  const [isSubscribed, setIsSubscribed] = useState(() => data.context.subscribed);
  const { user } = useUser();

  useEffect(() => {
    setIsSubscribed(data.context.subscribed);
  }, [data.context.subscribed]);

  const userRole = data.team.find((e) => e[0] === user.username);
  const userCanModerate = data.team.find((e) => e[0] === user.username);
  const adminRole = data.team.find((e) => e[0] === user.username && e[1] === 'admin');

  return (
    <Card
      className="my-4 grid h-fit w-full grid-cols-3 gap-4 p-2 text-primary dark:bg-background"
      data-testid="community-simple-description-sidebar"
    >
      <CardHeader className="col-span-2 p-0">
        <CardTitle className="flex items-center gap-1">
          <span>{data.title}</span>
          {data.is_nsfw ? <Badge variant="red">NSFW</Badge> : null}
        </CardTitle>
        <div className="flex">
          <div className="flex w-full text-sm">
            <SubsListDialog
              title={data.title}
              subs={subs}
              moderateEnabled={Boolean(userCanModerate)}
              community={username}
            >
              <div className="flex flex-col items-center" data-testid="community-simple-subscribers">
                {data.subscribers} {t('communities.buttons.subscribers')}
              </div>
            </SubsListDialog>
            <span className="mx-1">•</span>
            <div className="flex flex-col items-center" data-testid="community-simple-active-posters">
              {data.num_authors} {t('communities.titles.active_posters')}
            </div>
          </div>
          <div className="flex flex-col justify-self-end whitespace-nowrap text-sm">
            <ActivityLogDialog username={username} data={notificationData}>
              {t('communities.buttons.activity_log')}
            </ActivityLogDialog>
            <div className="flex items-center gap-1">
              {userRole ? (
                <>
                  <span>{userRole[1].charAt(0).toUpperCase() + userRole[1].slice(1)}:</span>{' '}
                  <Link href={`/roles/${username}`} className="text-destructive">
                    {t('communities.roles')}
                  </Link>
                </>
              ) : null}
              {adminRole ? (
                <>
                  <Separator orientation="vertical" className="h-6" />
                  <EditCommunityDialog data={data} />
                </>
              ) : null}
            </div>
          </div>
        </div>
        <span className="text-sm">{data.about}</span>
      </CardHeader>
      <CardContent className="col-span-1 flex items-center justify-center p-0">
        <div className="my-4 flex flex-col gap-4">
          <SubscribeCommunity
            user={user}
            community={data.name}
            isSubscribed={isSubscribed}
            onIsSubscribed={(e) => setIsSubscribed(e)}
          />
          <NewPost disabled={!isSubscribed} name={data.name} />
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunitySimpleDescription;
