import type { ComponentPropsWithRef } from 'react';
import { TooltipContainer } from './vote-tooltip-container';

type VoteDialogButtonProps = ComponentPropsWithRef<'button'> & {
  label: string;
  dataTestId: string;
  afterPayout: boolean;
};

/**
 * Vote arrow that opens a dialog (login, vote removal), meant as the child of the dialog's
 * trigger: the props the trigger merges in go to the `<button>`. Nesting the dialog inside the
 * tooltip instead would let focus moving into the dialog bubble up the React tree and reopen the
 * tooltip, which then takes the first Esc. `label` is the accessible name and the tooltip; the
 * icon should be `aria-hidden`.
 */
const VoteDialogButton = ({ label, dataTestId, afterPayout, ...props }: VoteDialogButtonProps) => (
  <TooltipContainer loading={false} text={label} dataTestId={dataTestId} afterPayout={afterPayout}>
    <button type="button" className="flex h-full items-center justify-center" aria-label={label} {...props} />
  </TooltipContainer>
);

export default VoteDialogButton;
