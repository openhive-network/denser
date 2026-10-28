'use client';

import { Icons } from '@ui/components/icons';
import { useTranslation } from '@/blog/i18n/client';
import type { GraduationStep } from './lite-graduation';

/** The checklist's items; the gateway creates the account and delegates RC in one request. */
const ITEMS = ['keys', 'creating', 'delegating', 'linking'] as const;
type Item = (typeof ITEMS)[number];

/** Which step each item belongs to: the item is done once a later step runs. */
const ITEM_STEP: Record<Item, GraduationStep> = {
  keys: 'keys',
  creating: 'creating',
  delegating: 'creating',
  linking: 'linking'
};
const STEP_ORDER: GraduationStep[] = ['keys', 'creating', 'linking'];

type ItemStatus = 'done' | 'current' | 'pending' | 'failed';

function itemStatus(item: Item, step: GraduationStep | 'done', linkFailed: boolean): ItemStatus {
  if (step === 'done') return item === 'linking' && linkFailed ? 'failed' : 'done';
  const at = STEP_ORDER.indexOf(step);
  const own = STEP_ORDER.indexOf(ITEM_STEP[item]);
  if (own < at) return 'done';
  return own === at ? 'current' : 'pending';
}

const StatusIcon = ({ status }: { status: ItemStatus }) => {
  if (status === 'done') return <Icons.check className="h-4 w-4 text-green-600" />;
  if (status === 'current') return <Icons.spinner className="h-4 w-4 animate-spin" />;
  if (status === 'failed') return <Icons.x className="h-4 w-4 text-destructive" />;
  return <Icons.circle className="h-4 w-4 text-muted-foreground" />;
};

/**
 * The graduation's progress: the signer's keys, creating the account, delegating RC, linking the
 * lite account. `step` 'done' shows the outcome, with the link failed when `linkFailed`.
 */
export default function LiteGraduationProgress({
  step,
  linkFailed = false
}: {
  step: GraduationStep | 'done';
  linkFailed?: boolean;
}) {
  const { t } = useTranslation('common_blog');
  return (
    <ol className="flex flex-col gap-2" data-testid="lite-graduation-progress">
      {ITEMS.map((item) => {
        const status = itemStatus(item, step, linkFailed);
        return (
          <li key={item} className="flex items-center gap-2 text-sm" data-testid={`lite-graduation-step-${item}`} data-status={status}>
            <StatusIcon status={status} />
            {t(`lite_account.graduation.steps.${item}`)}
          </li>
        );
      })}
    </ol>
  );
}
