import { ReactNode, useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@ui/components/popover';
import { TooltipContainer } from './vote-tooltip-container';

const SLIDER_POPOVER_SIDE_OFFSET = -37;
const SLIDER_POPOVER_ALIGN_OFFSET = -19;

interface WeightedVoteButtonProps {
  /** Opens the weight slider (`children`) on click instead of voting at full weight. */
  sliderEnabled: boolean;
  loading: boolean;
  tooltipText: string;
  dataTestId: string;
  sliderTestId: string;
  afterPayout: boolean;
  icon: ReactNode;
  onFullWeightVote: () => void;
  children: ReactNode;
}

interface OutsideInteraction {
  target: EventTarget | null;
  preventDefault: () => void;
}

/**
 * A vote button that votes at full weight, or, for voters with enough vests, opens a
 * popover with the weight slider. The popover root is always mounted and gets its anchor
 * only while open, so enabling the slider when the voter's account loads re-renders the
 * button without remounting it.
 */
const WeightedVoteButton = ({
  sliderEnabled,
  loading,
  tooltipText,
  dataTestId,
  sliderTestId,
  afterPayout,
  icon,
  onFullWeightVote,
  children
}: WeightedVoteButtonProps) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (loading) return;
    if (sliderEnabled) {
      setOpen((wasOpen) => !wasOpen);
    } else {
      onFullWeightVote();
    }
  };

  // A press on the button toggles the popover in handleClick; dismissing it here as an
  // outside interaction would make that click reopen it.
  const ignoreButtonPress = (event: OutsideInteraction) => {
    if (event.target instanceof Node && buttonRef.current?.contains(event.target)) event.preventDefault();
  };

  const focusButton = (event: Event) => {
    event.preventDefault();
    buttonRef.current?.focus();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {open ? <PopoverAnchor virtualRef={buttonRef} /> : null}
      <TooltipContainer loading={loading} text={tooltipText} dataTestId={dataTestId} afterPayout={afterPayout}>
        <button
          ref={buttonRef}
          className="flex h-full items-center justify-center"
          disabled={loading}
          aria-haspopup={sliderEnabled ? 'dialog' : undefined}
          aria-expanded={sliderEnabled ? open : undefined}
          onClick={handleClick}
        >
          {icon}
        </button>
      </TooltipContainer>
      <PopoverContent
        className="z-50 max-w-xs rounded-lg bg-background-secondary p-4 shadow-lg"
        sideOffset={SLIDER_POPOVER_SIDE_OFFSET}
        align="start"
        alignOffset={SLIDER_POPOVER_ALIGN_OFFSET}
        data-testid={sliderTestId}
        onInteractOutside={ignoreButtonPress}
        onCloseAutoFocus={focusButton}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
};

export default WeightedVoteButton;
