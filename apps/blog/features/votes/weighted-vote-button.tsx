import { ReactNode, RefObject, useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@ui/components/popover';
import { TooltipContainer } from './vote-tooltip-container';
import { useVoteSliderEnabled } from './hooks/use-vote-slider-enabled';

const SLIDER_POPOVER_SIDE_OFFSET = -37;
const SLIDER_POPOVER_ALIGN_OFFSET = -19;

interface WeightedVoteButtonProps {
  loading: boolean;
  /** The button's accessible name and tooltip; the `icon` should be `aria-hidden`. */
  tooltipText: string;
  /** Accessible name of the slider popover. */
  popoverLabel: string;
  dataTestId: string;
  sliderTestId: string;
  afterPayout: boolean;
  icon: ReactNode;
  onFullWeightVote: () => void;
  /** The weight slider, opened on click instead of voting at full weight for voters with enough vests. */
  children: ReactNode;
}

interface OutsideInteraction {
  target: EventTarget | null;
  preventDefault: () => void;
}

interface VoteTriggerProps {
  ref: RefObject<HTMLButtonElement | null>;
  loading: boolean;
  label: string;
  open: boolean;
  onToggleSlider: () => void;
  onFullWeightVote: () => void;
  children: ReactNode;
}

/**
 * The arrow itself, the only part that depends on the voter's vests: their account loading
 * re-renders this button, not the tooltip and popover around it.
 */
const VoteTrigger = ({ ref, loading, label, open, onToggleSlider, onFullWeightVote, children }: VoteTriggerProps) => {
  const sliderEnabled = useVoteSliderEnabled();

  const handleClick = () => {
    if (loading) return;
    if (sliderEnabled) {
      onToggleSlider();
    } else {
      onFullWeightVote();
    }
  };

  return (
    <button
      ref={ref}
      className="flex h-full items-center justify-center"
      disabled={loading}
      aria-label={label}
      aria-haspopup={sliderEnabled ? 'dialog' : undefined}
      aria-expanded={sliderEnabled ? open : undefined}
      onClick={handleClick}
    >
      {children}
    </button>
  );
};

/**
 * A vote button that votes at full weight, or, for voters with enough vests, opens a
 * popover with the weight slider. The popover is anchored to the button by ref, so it is
 * mounted beside the button on its first opening: a page renders one of these per post and
 * comment, and most are never opened.
 */
const WeightedVoteButton = ({
  loading,
  tooltipText,
  popoverLabel,
  dataTestId,
  sliderTestId,
  afterPayout,
  icon,
  onFullWeightVote,
  children
}: WeightedVoteButtonProps) => {
  const [open, setOpen] = useState(false);
  const [sliderMounted, setSliderMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleSlider = () => {
    setSliderMounted(true);
    setOpen((wasOpen) => !wasOpen);
  };

  // A press on the button toggles the popover in toggleSlider; dismissing it here as an
  // outside interaction would make that click reopen it.
  const ignoreButtonPress = (event: OutsideInteraction) => {
    if (event.target instanceof Node && buttonRef.current?.contains(event.target)) event.preventDefault();
  };

  // Radix would focus the first focusable element, the submit button, so a second Enter
  // would broadcast the vote straight away; start on the slider instead.
  const focusSlider = (event: Event) => {
    if (!(event.currentTarget instanceof HTMLElement)) return;
    const slider = event.currentTarget.querySelector<HTMLElement>('[role="slider"]');
    if (!slider) return;
    event.preventDefault();
    slider.focus();
  };

  const focusButton = (event: Event) => {
    event.preventDefault();
    buttonRef.current?.focus();
  };

  return (
    <>
      <TooltipContainer loading={loading} text={tooltipText} dataTestId={dataTestId} afterPayout={afterPayout}>
        <VoteTrigger
          ref={buttonRef}
          loading={loading}
          label={tooltipText}
          open={open}
          onToggleSlider={toggleSlider}
          onFullWeightVote={onFullWeightVote}
        >
          {icon}
        </VoteTrigger>
      </TooltipContainer>
      {sliderMounted ? (
        <Popover open={open} onOpenChange={setOpen}>
          {open ? <PopoverAnchor virtualRef={buttonRef} /> : null}
          <PopoverContent
            className="z-50 max-w-xs rounded-lg bg-background-secondary p-4 shadow-lg"
            sideOffset={SLIDER_POPOVER_SIDE_OFFSET}
            align="start"
            alignOffset={SLIDER_POPOVER_ALIGN_OFFSET}
            data-testid={sliderTestId}
            aria-label={popoverLabel}
            onOpenAutoFocus={focusSlider}
            onInteractOutside={ignoreButtonPress}
            onCloseAutoFocus={focusButton}
          >
            {children}
          </PopoverContent>
        </Popover>
      ) : null}
    </>
  );
};

export default WeightedVoteButton;
