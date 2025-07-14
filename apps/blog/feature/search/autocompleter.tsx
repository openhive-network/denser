import { Command as CommandPrimitive } from 'cmdk';
import { useState, useCallback, type KeyboardEvent, RefObject } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@ui/lib/utils';
import { Skeleton } from '@ui/components/skeleton';
import { CommandInput } from './command';
import { CommandGroup, CommandItem, CommandList } from '@ui/components/command';

type AutoCompleteProps = {
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  options: string[];
  emptyMessage: string;
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  inputRef: RefObject<HTMLInputElement>;
  placeholder?: string;
};

export const AutoComplete = ({
  onKeyDown,
  options,
  placeholder,
  emptyMessage,
  value,
  onValueChange,
  disabled,
  className,
  inputRef,
  isLoading = false
}: AutoCompleteProps) => {
  const [isOpen, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(value);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      // Keep the options displayed when the user is typing
      if (!isOpen) {
        setOpen(true);
      }

      // This is not a default behaviour of the <input /> field
      if (event.key === 'Enter' && input.value !== '') {
        const optionToSelect = options.find((option) => option === input.value);
        if (optionToSelect) {
          setSelected(optionToSelect);
          onValueChange(optionToSelect ?? '');
        }
      }

      if (event.key === 'Escape') {
        input.blur();
      }
    },
    [isOpen, options, onValueChange]
  );

  // const handleBlur = useCallback(() => {
  //   setOpen(false);
  //   onValueChange(selected);
  // }, [selected]);

  const handleSelectOption = useCallback(
    (selectedOption: string) => {
      onValueChange(selectedOption);

      setSelected(selectedOption);
      onValueChange(selectedOption);

      // This is a hack to prevent the input from being focused after the user selects an option
      // We can call this hack: "The next tick"
      setTimeout(() => {
        inputRef?.current?.blur();
      }, 0);
    },
    [onValueChange]
  );

  return (
    <CommandPrimitive onKeyDown={handleKeyDown}>
      <div className="flex items-center">
        <CommandInput
          onKeyDown={onKeyDown}
          ref={inputRef}
          value={value}
          onValueChange={isLoading ? undefined : onValueChange}
          // onBlur={handleBlur}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="text-base"
          containterClassName={className}
        />
      </div>
      <div className="relative mt-1 hidden">
        <div
          className={cn(
            'absolute top-0 z-10 w-full rounded-xl outline-none animate-in fade-in-0 zoom-in-95',
            isOpen ? 'block' : 'hidden'
          )}
        >
          <CommandList className="rounded-lg ring-1">
            {isLoading ? (
              <CommandPrimitive.Loading>
                <div className="p-1">
                  <Skeleton className="h-8 w-full" />
                </div>
              </CommandPrimitive.Loading>
            ) : null}
            {options.length > 0 && !isLoading ? (
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected === option;
                  return (
                    <CommandItem
                      key={option}
                      value={option}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onSelect={() => handleSelectOption(option)}
                      className="flex w-full items-center gap-2"
                    >
                      {option}
                      {isSelected ? <Check className="w-4" /> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}
            {!isLoading ? (
              <CommandPrimitive.Empty className="select-none rounded-sm px-2 py-3 text-center text-sm">
                {emptyMessage}
              </CommandPrimitive.Empty>
            ) : null}
          </CommandList>
        </div>
      </div>
    </CommandPrimitive>
  );
};
