'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CircleSpinner } from 'react-spinners-kit';
import { buildLiteReplyRequest, type LiteIdentity } from '@hive/lite-account';
import { Button } from '@ui/components/button';
import { toast } from '@ui/components/hooks/use-toast';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { useTranslation } from '@/blog/i18n/client';
import LiteNameDialog from './lite-name-dialog';
import { useLiteIdentity } from './use-lite-identity';
import { useLiteRelayInfo } from './use-lite-relay-info';
import { useLiteReplyMutation } from './use-lite-reply-mutation';

const MdEditor = dynamic(() => import('../post-editor/md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center rounded-md border border-border bg-background-secondary/30">
      <CircleSpinner loading size={24} color="#dc2626" />
    </div>
  )
});

type Props = {
  parentAuthor: string;
  parentPermlink: string;
  discussionAuthor: string;
  discussionPermlink: string;
  observer: string;
  onSetReply: (open: boolean) => void;
};

/**
 * Reply box for readers who are NOT logged in (instant-comment flow, design doc §2):
 * type → (first time) pick a suggested name → a device key signs the attestation →
 * the relay posts it on L1. No sign-up ceremony.
 */
export function LiteReplyBox({ parentAuthor, parentPermlink, discussionAuthor, discussionPermlink, observer, onSetReply }: Props) {
  const { t } = useTranslation('common_blog');
  const relay = useLiteRelayInfo();
  const { identity, create, markRegistered, ensureClientId } = useLiteIdentity();
  const [text, setText, removeText] = useStorageWithTTL<string>(`lite-replyTo-/${parentAuthor}/${parentPermlink}`, '', StorageTTL.DRAFT);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const mutation = useLiteReplyMutation(() => {
    markRegistered();
    toast({ title: t('lite_account.save_identity.title'), description: t('lite_account.save_identity.description') });
  });

  const submit = async (who: LiteIdentity) => {
    if (!relay.data?.enabled) return;
    const built = buildLiteReplyRequest({
      identity: who,
      gateAccount: relay.data.gate_account,
      chainId: relay.data.chain_id,
      comment: { parent_author: parentAuthor, parent_permlink: parentPermlink, title: '', body: text, tags: [] },
      clientId: ensureClientId()
    });
    try {
      await mutation.mutateAsync({
        built,
        gateAccount: relay.data.gate_account,
        attester: who.name,
        body: text,
        parentAuthor,
        parentPermlink,
        discussionAuthor,
        discussionPermlink,
        observer
      });
    } catch {
      return; // the mutation's onError already rolled back and toasted
    }
    removeText();
    onSetReply(false);
    toast({ title: t('lite_account.posted.title'), description: t('lite_account.posted.description', { name: who.name }), variant: 'success' });
  };

  const onPost = () => {
    if (identity) void submit(identity);
    else setNameDialogOpen(true);
  };

  return (
    <div className="mb-4 flex w-full flex-col gap-4 rounded-lg border border-border bg-background p-4 text-primary shadow-sm" data-testid="lite-reply-editor">
      <p className="text-xs text-muted-foreground">
        {identity ? t('lite_account.replying_as', { name: identity.name }) : t('lite_account.reply_as_guest')}
      </p>
      <MdEditor onChange={setText} persistedValue={text} placeholder={t('post_content.footer.comment.reply')} ariaLabel={t('post_content.footer.comment.reply')} windowheight={200} />
      <div className="flex items-center gap-3">
        <Button size="sm" className="w-24" disabled={text === '' || mutation.isPending} onClick={onPost} data-testid="lite-reply-post">
          {mutation.isPending ? <CircleSpinner loading size={18} color="#dc2626" /> : t('post_content.footer.comment.post')}
        </Button>
        <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => onSetReply(false)} className="text-foreground/60 hover:text-destructive">
          {t('post_content.footer.comment.cancel')}
        </Button>
      </div>
      <LiteNameDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        onConfirm={(name) => {
          setNameDialogOpen(false);
          void submit(create(name));
        }}
      />
    </div>
  );
}
