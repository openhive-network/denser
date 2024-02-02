import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@ui/components/command';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';

export function Autocompleter() {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
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
  const items = [
    { user: 'JohnDoe', about: 'passionate' },
    { user: 'AliceSmith', about: 'creative' },
    { user: 'BobJohnson', about: 'enthusiastic' },
    { user: 'EvaWilliams', about: 'adventurous' },
    { user: 'MichaelBrown', about: 'analytical' },
    { user: 'SamanthaLee', about: 'ambitious' },
    { user: 'DavidMiller', about: 'friendly' },
    { user: 'OliviaJones', about: 'curious' },
    { user: 'MatthewClark', about: 'innovative' },
    { user: 'EmilyWhite', about: 'optimistic' }
  ];

  return (
    <Command className="rounded-lg border shadow-md">
      <CommandInput
        ref={inputRef}
        onFocus={handleInputFocus}
        value={value}
        onValueChange={(e) => setValue(value)}
      />
      <CommandList>
        <CommandGroup className="absolute max-h-24 overflow-scroll bg-white">
          {items.map((item) => (
            <CommandItem>
              <span>{item.user}</span>
              <span>({item.about})</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
