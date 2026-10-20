'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CircleSpinner } from 'react-spinners-kit';
import { buildLiteReplyRequest, type LiteIdentity } from '@hiveio/lite-account';
import { currentPostsNamespace } from '@transaction/lib/lite-api';
import { Button } from '@ui/components/button';
import { toast } from '@ui/components/hooks/use-toast';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { useTranslation } from '@/blog/i18n/client';
import { isLiteNameTaken } from './lite-name-availability';
import LiteNameDialog from './lite-name-dialog';
import { readiness, readinessText, useLiteGatewayHealth, type LiteReadiness } from './use-lite-gateway-health';
import { useLiteIdentity } from './use-lite-identity';
import { useLiteRelayInfo } from './use-lite-relay-info';
import { useLiteReplyMutation } from './use-lite-reply-mutation';
import { useRetryCountdown } from './use-retry-countdown';

const MdEditor = dynamic(() => import('../post-editor/md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center rounded-md border border-border bg-background-secondary/30">
      <CircleSpinner loading size={24} color="#dc2626" />
    </div>
  )
});

// How long Post stays disabled when the gateway is not ready and names no wait of its own.
const DEFAULT_RETRY_S = 10;

type Props = {
  /** The parent as the page's discussion names it (a DID on a lite-aware node). */
  parentAuthor: string;
  /** The parent's L1 author, when it differs from `parentAuthor`: the gate account of a DID parent. */
  l1ParentAuthor?: string;
  parentPermlink: string;
  discussionAuthor: string;
  discussionPermlink: string;
  observer: string;
  onSetReply: (open: boolean) => void;
};

/**
 * Reply box for readers who are NOT logged in (instant-comment flow, design doc §2):
 * type → (first time) pick a suggested name → a device key signs the attestation →
 * the relay posts it on L1. No sign-up ceremony. The gateway is asked once more right before
 * posting: when it cannot take the reply the draft stays, and Post waits out the gateway's delay.
 */
export function LiteReplyBox({ parentAuthor, l1ParentAuthor, parentPermlink, discussionAuthor, discussionPermlink, observer, onSetReply }: Props) {
  const { t } = useTranslation('common_blog');
  const relay = useLiteRelayInfo();
  const { identity, create, markRegistered, clear, ensureClientId } = useLiteIdentity();
  const [text, setText, removeText] = useStorageWithTTL<string>(`lite-replyTo-/${parentAuthor}/${parentPermlink}`, '', StorageTTL.DRAFT);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [takenName, setTakenName] = useState<string>();
  const health = useLiteGatewayHealth(true);
  const [checking, setChecking] = useState(false);
  const [notReady, setNotReady] = useState<LiteReadiness | null>(null);
  const countdown = useRetryCountdown();
  const mutation = useLiteReplyMutation(() => {
    markRegistered();
    toast({ title: t('lite_account.save_identity.title'), description: t('lite_account.save_identity.description') });
  });

  const waitingForGateway = countdown.secondsLeft !== null && !readiness(health.data, 'reply').ok;

  const gatewayReady = async (): Promise<boolean> => {
    setChecking(true);
    const fresh = await health.refetch();
    setChecking(false);
    const ready = readiness(fresh.data, 'reply');
    if (ready.ok) {
      setNotReady(null);
      countdown.clear();
      return true;
    }
    if (ready.reason === 'down') {
      setNotReady(null);
      toast({
        title: t('lite_account.gateway.unavailable_title'),
        description: `${readinessText(t, ready)} ${t('lite_account.gateway.draft_kept')}`,
        variant: 'destructive'
      });
    } else {
      setNotReady(ready);
      countdown.start(ready.availableInS ?? DEFAULT_RETRY_S);
    }
    return false;
  };

  const submit = async (who: LiteIdentity) => {
    if (!relay.data?.enabled) return;
    if (!(await gatewayReady())) return;
    const built = buildLiteReplyRequest({
      identity: who,
      gateAccount: relay.data.gate_account,
      chainId: relay.data.chain_id,
      apps: relay.data.apps,
      comment: { parent_author: l1ParentAuthor ?? parentAuthor, parent_permlink: parentPermlink, title: '', body: text, tags: [] },
      clientId: ensureClientId()
    });
    try {
      await mutation.mutateAsync({
        built,
        gateAccount: relay.data.gate_account,
        apps: relay.data.apps,
        attester: who.name,
        body: text,
        parentAuthor,
        parentPermlink,
        discussionAuthor,
        discussionPermlink,
        observer,
        native: currentPostsNamespace() === 'lite'
      });
    } catch (error) {
      // The mutation's onError already rolled back (and toasted anything but a taken name).
      if (isLiteNameTaken(error)) {
        clear();
        setTakenName(who.name);
        setNameDialogOpen(true);
      }
      return;
    }
    removeText();
    onSetReply(false);
    toast({ title: t('lite_account.posted.title'), description: t('lite_account.posted.description', { name: who.name }), variant: 'success' });
  };

  const onPost = () => {
    if (identity) void submit(identity);
    else setNameDialogOpen(true);
  };

  const postLabel = waitingForGateway
    ? t('lite_account.gateway.post_wait', { seconds: countdown.secondsLeft })
    : t('post_content.footer.comment.post');

  return (
    <div className="mb-4 flex w-full flex-col gap-4 rounded-lg border border-border bg-background p-4 text-primary shadow-sm" data-testid="lite-reply-editor">
      <p className="text-xs text-muted-foreground">
        {identity ? t('lite_account.replying_as', { name: identity.name }) : t('lite_account.reply_as_guest')}
      </p>
      <MdEditor onChange={setText} persistedValue={text} placeholder={t('post_content.footer.comment.reply')} ariaLabel={t('post_content.footer.comment.reply')} windowheight={200} />
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          className="min-w-24"
          disabled={text === '' || mutation.isPending || checking || waitingForGateway}
          onClick={onPost}
          data-testid="lite-reply-post"
        >
          {mutation.isPending || checking ? <CircleSpinner loading size={18} color="#dc2626" /> : postLabel}
        </Button>
        <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => onSetReply(false)} className="text-foreground/60 hover:text-destructive">
          {t('post_content.footer.comment.cancel')}
        </Button>
      </div>
      {waitingForGateway && notReady ? (
        <p className="text-xs text-muted-foreground" data-testid="lite-reply-gateway-wait">
          {readinessText(t, { ...notReady, availableInS: undefined })}
        </p>
      ) : null}
      <LiteNameDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        takenName={takenName}
        onConfirm={(name) => {
          setNameDialogOpen(false);
          setTakenName(undefined);
          void submit(create(name));
        }}
      />
    </div>
  );
}
