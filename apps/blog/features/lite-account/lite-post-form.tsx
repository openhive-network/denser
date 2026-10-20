'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { CircleSpinner } from 'react-spinners-kit';
import type { CommentContent, LiteIdentity, LiteRelayOk } from '@hiveio/lite-account';
import { getLiteApiInfo } from '@transaction/lib/lite-api';
import { getPostCategory } from '@transaction/lib/post-category';
import { Button } from '@ui/components/button';
import { toast } from '@ui/components/hooks/use-toast';
import { Input } from '@ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/components/select';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { isCommunity } from '@ui/lib/utils';
import { useTranslation } from '@/blog/i18n/client';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { useEditorCommunity } from '../post-editor/hooks/use-editor-community';
import { parseTags, validateTagInput } from '../post-editor/lib/utils';
import { LiteQueueStatus } from './lite-queue-status';
import { isLiteNameTaken } from './lite-name-availability';
import { isPersistedLiteQueue, liteRootPostPath, persistedQueueTtlMs, type PersistedLiteQueue } from './lite-root-post';
import { useLiteIdentity } from './use-lite-identity';
import { useLiteRelayInfo } from './use-lite-relay-info';
import { useLiteRootPostMutation } from './use-lite-root-post-mutation';

const MdEditor = dynamic(() => import('../post-editor/md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-md border border-border bg-background-secondary/30">
      <CircleSpinner loading size={24} color="#dc2626" />
    </div>
  )
});

/** The editor's "My blog" category: the post's category is then its first tag. */
const MY_BLOG = 'blog';
const LITE_POST_DRAFT_KEY = 'lite-postData-new';
const LITE_ROOT_QUEUE_KEY = 'lite-root-queue';

type LiteRootDraft = { title: string; body: string; tags: string; category: string };
const EMPTY_DRAFT: LiteRootDraft = { title: '', body: '', tags: '', category: MY_BLOG };

function toComment(draft: LiteRootDraft): CommentContent {
  const tags = parseTags(draft.tags);
  return { parent_author: '', parent_permlink: getPostCategory(draft.category, tags), title: draft.title, body: draft.body, tags };
}

type Props = {
  identity: LiteIdentity;
  categoryParam?: string;
  /** The gateway refused to register the identity's name as taken. */
  onNameTaken: (name: string) => void;
};

/**
 * The post editor of a guest with a lite identity: title, body, tags and "My blog" or the
 * community the page was opened for. Posting goes through the lite gateway; a queued post shows
 * the queue panel instead of the editor, also after a reload. The draft is kept until the post is up.
 */
export function LitePostForm({ identity, categoryParam, onNameTaken }: Props) {
  const { t } = useTranslation('common_blog');
  const router = useRouter();
  const relay = useLiteRelayInfo();
  const limits = relay.data?.enabled ? relay.data.limits : undefined;
  const { markRegistered } = useLiteIdentity();
  const mutation = useLiteRootPostMutation();
  const [draft, setDraft, removeDraft] = useStorageWithTTL<LiteRootDraft>(LITE_POST_DRAFT_KEY, EMPTY_DRAFT, StorageTTL.DRAFT);
  const [storedQueue, setQueue, removeQueue] = useStorageWithTTL<PersistedLiteQueue | null>(LITE_ROOT_QUEUE_KEY, null, persistedQueueTtlMs(limits));
  const pending = isPersistedLiteQueue(storedQueue) ? storedQueue : null;
  const { data: community } = useEditorCommunity(categoryParam, draft.category, DEFAULT_OBSERVER);
  const update = (patch: Partial<LiteRootDraft>) => setDraft((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (isCommunity(categoryParam) && categoryParam) setDraft((prev) => ({ ...prev, category: categoryParam }));
  }, [categoryParam, setDraft]);

  const tagsCheck = validateTagInput(draft.tags, draft.category === MY_BLOG, t);
  const communityName = [categoryParam, draft.category].find((name) => isCommunity(name));

  const finish = async (result: LiteRelayOk, comment: CommentContent) => {
    removeDraft();
    removeQueue();
    toast({ title: t('lite_account.root_post.posted_title'), description: t('lite_account.root_post.posted_description', { name: identity.name }), variant: 'success' });
    // Asked once posted, as the editor reads no post that would have probed the node.
    const native = (await getLiteApiInfo()) !== null;
    const path = liteRootPostPath({ category: comment.parent_permlink, attester: identity.name, native, result });
    router.push(`${path}?pending=1`);
  };

  const submit = async () => {
    const outcome = await mutation.mutateAsync({ identity, comment: toComment(draft) }).catch((error: unknown) => {
      if (isLiteNameTaken(error)) onNameTaken(identity.name);
      return null;
    });
    if (!outcome) return; // the mutation toasted (or the name dialog reopened); the draft stays
    if (outcome.kind === 'queued') setQueue({ queued: outcome.queued, comment: outcome.comment });
    else await finish(outcome.result, outcome.comment);
  };

  if (pending) {
    return (
      <LiteQueueStatus
        pending={pending}
        onPosted={(result) => {
          if (!identity.registered) markRegistered();
          void finish(result, pending.comment);
        }}
        onCancelled={() => {
          removeQueue();
          toast({ title: t('lite_account.root_post.queue.cancelled_title'), description: t('lite_account.root_post.queue.cancelled_description') });
        }}
        onClose={(retry) => {
          removeQueue();
          if (retry) void submit();
        }}
      />
    );
  }

  return (
    <form className="flex flex-col gap-6" data-testid="lite-post-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <p className="text-xs text-muted-foreground" data-testid="lite-post-as">{t('lite_account.root_post.posting_as', { name: identity.name })}</p>
      <Input
        placeholder={t('submit_page.title')}
        value={draft.title}
        onChange={(e) => update({ title: e.target.value })}
        className="h-12 rounded-none border-0 border-b border-border bg-transparent px-1 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
        data-testid="post-title-input"
      />
      <MdEditor windowheight={500} onChange={(body) => update({ body })} persistedValue={draft.body} ariaLabel={t('submit_page.post_body')} />
      <div className="flex flex-col gap-1">
        <Input placeholder={t('submit_page.enter_your_tags')} value={draft.tags} onChange={(e) => update({ tags: e.target.value.replace(/,/g, ' ') })} data-testid="lite-post-tags" />
        {tagsCheck ? <p className="text-xs text-destructive">{tagsCheck}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">{t('submit_page.posting_to')}</span>
        <Select value={draft.category} onValueChange={(category) => update({ category })}>
          <SelectTrigger className="w-auto min-w-[140px]" data-testid="posting-to-list-trigger">
            <SelectValue placeholder={t('submit_page.select_category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={MY_BLOG}>{t('submit_page.my_blog')}</SelectItem>
            {communityName ? <SelectItem value={communityName}>{community?.title ?? communityName}</SelectItem> : null}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        variant="redHover"
        className="w-28"
        disabled={!draft.title || !draft.body || Boolean(tagsCheck) || mutation.isPending}
        data-testid="submit-post-button"
      >
        {mutation.isPending ? <CircleSpinner loading size={18} color="#dc2626" /> : t('submit_page.submit')}
      </Button>
    </form>
  );
}
