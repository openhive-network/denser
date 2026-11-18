import { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from '@/wallet/i18n/client';
import { formatShare, type Breakdown } from '@/wallet/lib/voters';

/** Segment colours, largest voter first; each holds its contrast on light and dark backgrounds. */
const SEGMENT_COLORS = [
  'bg-red-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-pink-500'
];
const REST_COLOR = 'bg-slate-300 dark:bg-slate-600';

interface SegmentView {
  key: string;
  label: string;
  share: number;
  color: string;
}

/**
 * The voters' shares as one stacked bar: a segment per voter of `breakdown`, the rest as one grey
 * segment. Hovering, focusing or tapping a segment names it under the bar ("@name · 42.2%"),
 * which names the largest voter until then.
 */
function VotersBreakdownBar({ breakdown }: { breakdown: Breakdown }) {
  const { t } = useTranslation('common_wallet');
  const segments: SegmentView[] = breakdown.segments.map((segment, index) => ({
    key: segment.name,
    label: `@${segment.name} · ${formatShare(segment.share)}`,
    share: segment.share,
    color: SEGMENT_COLORS[index % SEGMENT_COLORS.length]
  }));
  if (breakdown.rest) {
    segments.push({
      key: '',
      label: t('voters_dialog.others_share', {
        count: breakdown.rest.count,
        share: formatShare(breakdown.rest.share)
      }),
      share: breakdown.rest.share,
      color: REST_COLOR
    });
  }
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = segments.find((segment) => segment.key === activeKey) ?? segments[0];

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="group"
        aria-label={t('voters_dialog.breakdown_label')}
        data-testid="voters-breakdown-bar"
      >
        {segments.map((segment) => (
          <button
            key={segment.key}
            type="button"
            className={clsx(
              'h-full min-w-[3px] border-r border-white/70 last:border-r-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-950 dark:border-slate-950/70 dark:focus-visible:ring-white',
              segment.color
            )}
            style={{ width: `${segment.share * 100}%` }}
            title={segment.label}
            aria-label={segment.label}
            onMouseEnter={() => setActiveKey(segment.key)}
            onFocus={() => setActiveKey(segment.key)}
            onClick={() => setActiveKey(segment.key)}
            data-testid="voters-bar-segment"
          />
        ))}
      </div>
      <div className="h-4 truncate text-xs text-slate-600 dark:text-slate-300" aria-live="polite" data-testid="voters-bar-label">
        {active?.label}
      </div>
    </div>
  );
}

export default VotersBreakdownBar;
