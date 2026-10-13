import type { ComponentPropsWithRef } from 'react';
import { TooltipContainer } from './vote-tooltip-container';

type LoggedOutVoteButtonProps = ComponentPropsWithRef<'button'> & {
  label: string;
  dataTestId: string;
  afterPayout: boolean;
};

/**
 * Vote arrow shown to a logged-out visitor, meant as the child of `DialogLogin`: the props its
 * trigger merges in go to the `<button>`. Nesting the dialog inside the tooltip instead would let
 * focus moving into the dialog bubble up the React tree and reopen the tooltip, which then takes
 * the first Esc. `label` is the accessible name and the tooltip; the icon should be `aria-hidden`.
 */
const LoggedOutVoteButton = ({ label, dataTestId, afterPayout, ...props }: LoggedOutVoteButtonProps) => (
  <TooltipContainer loading={false} text={label} dataTestId={dataTestId} afterPayout={afterPayout}>
    <button type="button" className="flex h-full items-center justify-center" aria-label={label} {...props} />
  </TooltipContainer>
);

export default LoggedOutVoteButton;
