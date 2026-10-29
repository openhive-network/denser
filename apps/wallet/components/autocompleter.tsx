import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@ui/components/command';
import { cn } from '@ui/lib/utils';
import {
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';
type Item = {
  username: string;
  about: string;
};
type InputProps = Pick<
  ComponentPropsWithoutRef<typeof CommandInput>,
  'disabled' | 'aria-invalid' | 'aria-describedby'
>;
// cmdk renders only the items matching the input, so an empty filter result counts as closed.
const hasVisibleSuggestions = (root: HTMLElement | null, target: EventTarget | null) =>
  !!root &&
  target instanceof Node &&
  root.contains(target) &&
  root.querySelector('[cmdk-group][data-state="open"] [cmdk-item]') !== null;

export function Autocompleter({
  value,
  onChange,
  items,
  label,
  inputProps
}: {
  value: string;
  onChange: (e: string) => void;
  items?: Item[];
  /** Accessible name of the input: cmdk labels it with its own hidden label, so a `<label for>` cannot. */
  label?: string;
  inputProps?: InputProps;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [highlighted, setHighlighted] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<HTMLDivElement | null>(null);
  const expanded = isOpen && !!items?.length;
  // cmdk hard-codes aria-expanded="true" on its input, so the real state is written over it.
  useLayoutEffect(() => {
    inputRef.current?.setAttribute('aria-expanded', String(expanded));
  }, [expanded]);
  // cmdk marks the highlighted item aria-selected but leaves the input's aria-activedescendant empty.
  useLayoutEffect(() => {
    const option = expanded
      ? autocompleteRef.current?.querySelector(`[cmdk-item][data-value="${CSS.escape(highlighted)}"]`)
      : null;
    if (option?.id) inputRef.current?.setAttribute('aria-activedescendant', option.id);
    else inputRef.current?.removeAttribute('aria-activedescendant');
  }, [expanded, highlighted]);
  const handleInputFocus = () => {
    setIsOpen(true);
  };
  const handleValueChange = (next: string) => {
    setIsOpen(true);
    onChange(next);
  };
  const handleInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (!autocompleteRef.current?.contains(event.relatedTarget)) setIsOpen(false);
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') setIsOpen(true);
  };
  // Keeps the focus in the input, so picking a suggestion with the mouse does not blur it first.
  const keepInputFocus = (event: ReactMouseEvent) => event.preventDefault();

  // `mousedown`, not `click`: the click that opens the surrounding dialog mounts this component
  // and still bubbles to the document afterwards, which would close the list as it opens.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'Tab') {
        setIsOpen(false);
      }
    };
    // Capture phase on `window` runs before the surrounding dialog's own Escape listener on the
    // document, so an Escape that closes the suggestions does not also close the dialog.
    const onEscapeCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !hasVisibleSuggestions(autocompleteRef.current, e.target)) return;
      e.stopPropagation();
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onEscapeCapture, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keydown', onEscapeCapture, true);
    };
  }, []);

  return (
    <Command
      className="relative w-full overflow-visible border"
      ref={autocompleteRef}
      label={label}
      value={highlighted}
      onValueChange={setHighlighted}
    >
      <CommandInput
        {...inputProps}
        ref={inputRef}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        value={value}
        onValueChange={handleValueChange}
      />
      <CommandList className="z-20 bg-primary">
        {/* Hidden rather than unmounted: cmdk does not re-filter items that remount under a search. */}
        <CommandGroup
          data-state={isOpen ? 'open' : 'closed'}
          onMouseDown={keepInputFocus}
          className={cn(
            'absolute inset-x-0 max-h-36 overflow-y-auto overflow-x-hidden bg-background-secondary',
            !isOpen && 'hidden'
          )}
        >
          {/* The username alone is the value: cmdk's fuzzy filter would otherwise also match the
              about text, so a name prefix would find any account with "previous transfers". */}
          {items?.map((item) => (
            <CommandItem
              key={item.username}
              value={item.username}
              className="p-0"
              onSelect={() => onChange(item.username)}
            >
              <div
                onClick={() => onChange(item.username)}
                className="w-full truncate px-2 py-1 even:bg-background-tertiary"
              >
                {`${item.username} (${item.about})`}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
