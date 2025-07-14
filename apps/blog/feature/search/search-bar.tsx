import clsx from 'clsx';
import { useEffect, useRef, KeyboardEvent } from 'react';
import { getPlaceholder } from './utils/lib';
import { useSearch } from '@ui/hooks/useSearch';
import { AutoComplete } from './autocompleter';
import SmartSelect from './smart-select';

const SearchBar = ({ aiAvailable }: { aiAvailable: boolean }) => {
  const { inputValue, setInputValue, mode, setMode, handleSearch, secondInputValue, setSecondInputValue } =
    useSearch(aiAvailable);
  const inputRef = useRef<HTMLInputElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch(inputValue, mode);
    }
  };
  const placeholder = getPlaceholder(mode);

  useEffect(() => {
    if (inputValue.startsWith('/')) {
      setMode('userTopics');
      setInputValue(inputValue.slice(1));
    }
    if (inputValue.startsWith('%')) {
      setMode('ai');
      setInputValue(inputValue.slice(1));
    }
    if (inputValue.startsWith('$')) {
      setMode('classic');
      setInputValue(inputValue.slice(1));
    }
    if (inputValue.startsWith('@')) {
      setMode('users');
      setInputValue(inputValue.slice(1));
    }
    if (inputValue.startsWith('#')) {
      setMode('tags');
      setInputValue(inputValue.slice(1));
    }
    if (inputValue.startsWith('!')) {
      setMode('community');
      setInputValue(inputValue.slice(1));
    }
  }, [inputValue]);
  return (
    <div className="flex">
      <SmartSelect value={mode} onValueChange={setMode} aiDisabled={!aiAvailable} />
      <AutoComplete
        onKeyDown={onKeyDown}
        inputRef={inputRef}
        options={[]}
        emptyMessage="No results."
        placeholder={placeholder}
        onValueChange={setInputValue}
        value={inputValue}
        className={clsx('pl-0', {
          'w-24 rounded-none border-r-0 p-0 text-sm': mode === 'userTopics'
        })}
      />
      {mode === 'userTopics' ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="h-8 w-4 border-y border-destructive"
          >
            <path d="M22 2 2 22" />
          </svg>
          <AutoComplete
            onKeyDown={onKeyDown}
            inputRef={inputRef}
            options={[]}
            emptyMessage="No results."
            placeholder="Search topic..."
            onValueChange={setSecondInputValue}
            value={secondInputValue}
            className="w-32 pl-0"
          />
        </>
      ) : null}
    </div>
  );
};

export default SearchBar;
