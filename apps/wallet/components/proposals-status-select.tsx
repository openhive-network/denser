import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@hive/ui/components/select';
import { useTranslation } from '@/wallet/i18n/client';
import {
  PROPOSAL_STATUS_TABS,
  PROPOSAL_STATUS_LABEL_KEYS,
  type ProposalStatusTab
} from '@/wallet/lib/proposals-list';

export interface ProposalsStatusSelectProps {
  value: ProposalStatusTab;
  onValueChange: (value: string) => void;
  className?: string;
}

/** The status filter as a select, the narrow screens' alternative to the status tabs. */
export function ProposalsStatusSelect({ value, onValueChange, className }: ProposalsStatusSelectProps) {
  const { t } = useTranslation('common_wallet');
  const labelId = React.useId();
  const triggerId = React.useId();

  return (
    <div className={className}>
      <span id={labelId}>{t('select_sort.sort_proposals.status')}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={triggerId}
          aria-labelledby={`${labelId} ${triggerId}`}
          className="h-[35px] w-auto min-w-[120px] gap-2"
          data-testid="proposals-status-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent data-testid="proposals-status-select-content">
          <SelectGroup>
            {PROPOSAL_STATUS_TABS.map((status) => (
              <SelectItem key={status} value={status}>
                {t(PROPOSAL_STATUS_LABEL_KEYS[status])}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
