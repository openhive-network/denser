'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@ui/components/button';
import { useTranslation } from '@/blog/i18n/client';
import LiteNameDialog from './lite-name-dialog';
import { LitePostForm } from './lite-post-form';
import { useLiteIdentity } from './use-lite-identity';
import { useLiteRelayInfo } from './use-lite-relay-info';

type Props = { categoryParam?: string; signInPrompt: ReactNode };

/**
 * What a reader who is not logged in gets on the submit page: on a deployment with a lite gateway,
 * the guest post editor (after picking a lite name when this browser holds no identity yet);
 * anywhere else, the sign-in prompt as before.
 */
export function LitePostEntry({ categoryParam, signInPrompt }: Props) {
  const { t } = useTranslation('common_blog');
  const relay = useLiteRelayInfo();
  const { identity, create } = useLiteIdentity();
  const [nameDialogOpen, setNameDialogOpen] = useState(false);

  if (!relay.data?.enabled) return <>{signInPrompt}</>;
  if (identity) return <LitePostForm identity={identity} categoryParam={categoryParam} />;

  return (
    <div className="flex flex-col gap-4">
      {signInPrompt}
      <div className="flex flex-wrap items-center gap-3 text-sm" data-testid="lite-post-guest-offer">
        <span>{t('lite_account.root_post.write_as_guest')}</span>
        <Button size="sm" onClick={() => setNameDialogOpen(true)} data-testid="lite-post-start">
          {t('lite_account.root_post.start_as_guest')}
        </Button>
      </div>
      <LiteNameDialog
        open={nameDialogOpen}
        onOpenChange={setNameDialogOpen}
        onConfirm={(name) => {
          setNameDialogOpen(false);
          create(name);
        }}
      />
    </div>
  );
}
