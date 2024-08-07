import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@ui/components/command';
import { useEffect, useRef, useState } from 'react';
type Item = {
  username: string;
  about: string;
};
export function Autocompleter({
  value,
  onChange,
  items
}: {
  value: string;
  onChange: (e: string) => void;
  items?: Item[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<HTMLDivElement | null>(null);
  const handleInputFocus = () => {
    setIsOpen(true);
  };
  const handleClickOutside = (event: MouseEvent) => {
    if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };
  useEffect(() => {
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <Command className="w-full border" ref={autocompleteRef}>
      <CommandInput
        ref={inputRef}
        onFocus={handleInputFocus}
        value={value}
        onValueChange={(e) => onChange(e)}
      />
      <CommandList>
        {isOpen && (
          <CommandGroup className="absolute max-h-36 overflow-scroll bg-background-secondary">
            {items &&
              items.map((item) => (
                <CommandItem key={item.username} className="p-0" onSelect={() => onChange(item.username)}>
                  <div
                    onClick={() => onChange(item.username)}
                    className="w-56 px-2 py-1 even:bg-background-tertiary"
                  >
                    {item.username + `(${item.about})`}
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
