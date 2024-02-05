import { cn } from '@/blog/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@hive/ui/components/card';
import Link from 'next/link';
import { Button } from '@hive/ui/components/button';
import ln2list from '@/blog/lib/ln2list';
import { DefaultRenderer } from '@hiveio/content-renderer';
import { getDoubleSize, proxifyImageUrl } from '@hive/ui/lib/old-profixy';
import { AccountNotification, Community, Subscription } from '@/blog/lib/bridge';
import { SubsListDialog } from './subscription-list-dialog';
import { ActivityLogDialog } from './activity-log-dialog';
import { Badge } from '@hive/ui/components/badge';
import DialogLogin from './dialog-login';
import { useTranslation } from 'next-i18next';
import { CommunityOperationBuilder } from '@hive/wax/web';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { Signer } from '@smart-signer/lib/signer';
import { logger } from '@ui/lib/logger';
import { toast } from '@ui/components/hooks/use-toast';

const CommunityDescription = ({
  data,
  subs,
  notificationData,
  username
}: {
  data: Community;
  subs: Subscription[];
  notificationData: AccountNotification[] | null | undefined;
  username: string;
}) => {
  const { user } = useUser();
  const { t } = useTranslation('common_blog');
  const renderer = new DefaultRenderer({
    baseUrl: 'https://hive.blog/',
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addNofollowToLinks: true,
    addTargetBlankToLinks: true,
    addCssClassToLinks: 'external-link',
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

  async function subscribe(type: string) {
    if (user && user.isLoggedIn) {
      const customJsonOperations: any[] = [];
      const cob = new CommunityOperationBuilder();
      if (type === 'subscribe') {
        cob.subscribe(username).authorize(user.username).build().flushOperations(customJsonOperations);
      }

      if (type === 'unsubscribe') {
        cob.unsubscribe(username).authorize(user.username).build().flushOperations(customJsonOperations);
      }

      const signer = new Signer();
      try {
        await signer.broadcastTransaction({
          operation: customJsonOperations[0],
          loginType: user.loginType,
          username: user.username
        });
      } catch (e) {
        //
        // TODO Improve messages displayed to user, after we do better
        // (unified) error handling in smart-signer.
        //
        logger.error('got error', e);
        let description = 'Transaction broadcast error';
        if (`${e}`.indexOf('vote on this comment is identical') >= 0) {
          description = 'Your current vote on this comment is identical to this vote.';
        } else if (`${e}`.indexOf('Not implemented') >= 0) {
          description = 'Method not implemented for this login type.';
        }
        toast({
          description,
          variant: 'destructive'
        });
      }
    }
  }

  return (
    <div className="flex w-auto max-w-[240px] flex-col">
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
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <SubsListDialog title={data.title} subs={subs}>
              <div className="flex flex-col items-center" data-testid="community-subscribers">
                {data.subscribers}
                <span className="text-center text-xs">{t('communities.buttons.subscribers')}</span>
              </div>
            </SubsListDialog>
            <div className="flex flex-col items-center" data-testid="community-pending-rewards">
              {data.sum_pending}
              <span className="text-center text-xs">{t('communities.titles.pending_rewards')}</span>
            </div>
            <div className="flex flex-col items-center" data-testid="community-active-posters">
              {data.num_authors}
              <span className="text-center text-xs">{t('communities.titles.active_posters')}</span>
            </div>
          </div>
          <div className="my-4 flex flex-col gap-2">
            {user && user.isLoggedIn ? (
              <>
                {!data.context.subscribed ? (
                  <Button
                    size="sm"
                    className="w-full bg-blue-800 text-center hover:bg-blue-900"
                    data-testid="community-subscribe-button"
                    onClick={() => subscribe('subscribe')}
                  >
                    {t('communities.buttons.subscribe')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="group relative w-full text-center text-blue-800 hover:border-red-500 hover:text-red-500"
                    onClick={() => subscribe('unsubscribe')}
                  >
                    <span className="group-hover:hidden">Joined</span>
                    <span className="hidden group-hover:inline">Leave</span>
                  </Button>
                )}
              </>
            ) : (
              <DialogLogin>
                <Button
                  size="sm"
                  className="w-full bg-blue-800 text-center hover:bg-blue-900"
                  data-testid="community-subscribe-button"
                >
                  {t('communities.buttons.subscribe')}
                </Button>
              </DialogLogin>
            )}
            <Button
              size="sm"
              className="w-full bg-blue-800 text-center hover:bg-blue-900"
              data-testid="community-new-post-button"
            >
              <Link href={`submit.html?category=${data.name}`}>{t('communities.buttons.new_post')}</Link>
            </Button>
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
