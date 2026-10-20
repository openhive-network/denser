'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CircleSpinner } from 'react-spinners-kit';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { isCommunity } from '@ui/lib/utils';
import { useTranslation } from '@/blog/i18n/client';
import { parseTags, validateTagInput } from '../post-editor/lib/utils';
import type { DiscussionParams } from '../post-rendering/lib/discussion-cache';
import { useLiteEditMutation } from './use-lite-manage-mutations';

const MdEditor = dynamic(() => import('../post-editor/md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] w-full items-center justify-center rounded-md border border-border bg-background-secondary/30">
      <CircleSpinner loading size={24} color="#dc2626" />
    </div>
  )
});

const POST_EDITOR_HEIGHT = 500;
const COMMENT_EDITOR_HEIGHT = 200;

const tagsOf = (entry: Entry): string[] => {
  const tags: unknown = entry.json_metadata?.tags;
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [];
};

/** A root post's tags as typed, with its category kept first: hived does not move a post to another one. */
function postTags(entry: Entry, typed: string): string[] {
  const tags = parseTags(typed);
  if (isCommunity(entry.category) || tags.includes(entry.category)) return tags;
  return [entry.category, ...tags];
}

type Props = DiscussionParams & { entry: Entry; onClose: () => void };

/**
 * The editor a lite owner gets for their own post (title, body, tags) or comment (body), filled
 * with its current content. Saving goes through the gateway's /edit; on a failure the editor stays
 * open with the text.
 */
export function LiteEditForm({ entry, onClose, ...discussion }: Props) {
  const { t } = useTranslation('common_blog');
  const isPost = !entry.parent_author;
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const [tags, setTags] = useState(() => tagsOf(entry).join(' '));
  const mutation = useLiteEditMutation();
  const tagsCheck = isPost ? validateTagInput(tags, false, t) : null;
  const invalid = body.trim() === '' || (isPost && title.trim() === '') || Boolean(tagsCheck);

  const save = async () => {
    const nextTags = isPost ? postTags(entry, tags) : tagsOf(entry);
    // A guest reply is posted without a title; the cached one may be the optimistic `Re: …`.
    const nextTitle = isPost ? title : '';
    const saved = await mutation.mutateAsync({ ...discussion, entry, title: nextTitle, body, tags: nextTags }).then(
      () => true,
      () => false // the mutation restored the cache and toasted
    );
    if (saved) onClose();
  };

  return (
    <form
      className="flex w-full flex-col gap-4 p-2"
      data-testid="lite-edit-form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {isPost ? (
        <Input
          placeholder={t('submit_page.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 rounded-none border-0 border-b border-border bg-transparent px-1 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
          data-testid="lite-edit-title"
        />
      ) : null}
      <MdEditor
        windowheight={isPost ? POST_EDITOR_HEIGHT : COMMENT_EDITOR_HEIGHT}
        onChange={setBody}
        persistedValue={body}
        ariaLabel={isPost ? t('submit_page.post_body') : t('post_content.footer.comment.reply')}
      />
      {isPost ? (
        <div className="flex flex-col gap-1">
          <Input
            placeholder={t('submit_page.enter_your_tags')}
            value={tags}
            onChange={(e) => setTags(e.target.value.replace(/,/g, ' '))}
            data-testid="lite-edit-tags"
          />
          {tagsCheck ? <p className="text-xs text-destructive">{tagsCheck}</p> : null}
        </div>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" className="min-w-24" disabled={invalid || mutation.isPending} data-testid="lite-edit-save">
          {mutation.isPending ? <CircleSpinner loading size={18} color="#dc2626" /> : t('lite_account.manage.save')}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={mutation.isPending} onClick={onClose} className="text-foreground/60 hover:text-destructive">
          {t('lite_account.manage.cancel')}
        </Button>
      </div>
    </form>
  );
}
