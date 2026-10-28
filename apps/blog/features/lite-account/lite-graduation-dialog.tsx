'use client';

import { Link } from '@hive/ui';
import { Button } from '@ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@ui/components/dialog';
import { useTranslation } from '@/blog/i18n/client';
import LiteGraduatedSignIn from './lite-graduated-sign-in';
import LiteGraduationNameStep from './lite-graduation-name-step';
import LiteGraduationProgress from './lite-graduation-progress';
import { useLiteGraduationFlow, type GraduationFlowState } from './use-lite-graduation-flow';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** An account created earlier whose link is not confirmed: the dialog opens on the retry. */
  pendingLink?: string;
};

function Outcome({ state, onRetry, onClose }: {
  state: Extract<GraduationFlowState, { phase: 'done' | 'link_failed' }>;
  onRetry: (account: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('common_blog');
  const { account } = state;
  const linkFailed = state.phase === 'link_failed';
  return (
    <div className="flex flex-col gap-4" data-testid="lite-graduation-outcome" data-phase={state.phase}>
      <LiteGraduationProgress step={linkFailed && state.retrying ? 'linking' : 'done'} linkFailed={linkFailed} />
      <p className="text-sm">
        {t(linkFailed ? 'lite_account.graduation.created_unlinked' : 'lite_account.graduation.done')}{' '}
        <Link href={`/@${account}`} className="font-semibold text-destructive" data-testid="lite-graduation-account-link">
          @{account}
        </Link>
      </p>
      {linkFailed && state.error ? (
        <p className="text-sm text-destructive" role="alert" data-testid="lite-graduation-error">
          {t(state.error)}
        </p>
      ) : null}
      <DialogFooter className="flex-col gap-2 sm:flex-col">
        {linkFailed ? (
          <Button type="button" disabled={state.retrying} onClick={() => onRetry(account)} data-testid="lite-graduation-retry-link">
            {t('lite_account.graduation.retry_link')}
          </Button>
        ) : (
          <LiteGraduatedSignIn account={account} onSignedIn={onClose} />
        )}
      </DialogFooter>
    </div>
  );
}

/**
 * "Upgrade to a Hive account": the account's name, then the signer's keys for it, its creation by
 * the gateway and the lite account's link to it, then a one-click sign-in as the new account.
 * Loaded when opened (`next/dynamic`); the lite identity stays usable afterwards.
 */
export default function LiteGraduationDialog({ open, onOpenChange, pendingLink }: Props) {
  const { t } = useTranslation('common_blog');
  const { identity, state, start, retryLink } = useLiteGraduationFlow(pendingLink);
  const running = state.phase === 'running' || (state.phase === 'link_failed' && state.retrying);
  // A running step cannot be stopped: the dialog stays until it ends.
  const changeOpen = (next: boolean) => {
    if (next || !running) onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="flex max-w-[460px] flex-col gap-4" data-testid="lite-graduation-dialog">
        <DialogHeader>
          <DialogTitle>{t('lite_account.graduation.title')}</DialogTitle>
          <DialogDescription>{t('lite_account.graduation.description')}</DialogDescription>
        </DialogHeader>
        {state.phase === 'name' && identity ? (
          <LiteGraduationNameStep ownName={identity.name} error={state.error} onUpgrade={start} />
        ) : null}
        {state.phase === 'running' ? <LiteGraduationProgress step={state.step} /> : null}
        {state.phase === 'done' || state.phase === 'link_failed' ? (
          <Outcome state={state} onRetry={retryLink} onClose={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
