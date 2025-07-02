import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

type SearchMode = 'ai' | 'search';

export function useSearch(aiAvailable: boolean) {
  const router = useRouter();
  const sort = router.query.s as string;
  const query = router.query.q as string;
  const [inputValue, setInputValue] = useState(query ?? '');
  const [mode, setMode] = useState<SearchMode>(!aiAvailable || !!sort ? 'search' : 'ai');

  useEffect(() => {
    if (aiAvailable && !sort) {
      setMode('ai');
    }
  }, [aiAvailable, sort]);

  const handleSearch = (value: string, currentMode: SearchMode) => {
    if (value.startsWith('%')) setInputValue(value.slice(1));
    if (value.startsWith('/')) {
      const [first_word, ...all_after] = value.trim().slice(1).split(' ');
      router.push(`/search?a=${encodeURIComponent(first_word)}&p=${encodeURIComponent(all_after.join(' '))}`);
      return;
    }
    if (value.startsWith('@')) {
      router.push(`@${encodeURIComponent(value.trim().slice(1))}`);
      return;
    } else {
      const searchParams =
        currentMode === 'search'
          ? `q=${encodeURIComponent(value)}&s=${sort ?? 'newest'}`
          : `q=${encodeURIComponent(value)}`;
      router.push(`/search?${searchParams}`);
      return;
    }
  };

  return {
    inputValue,
    setInputValue,
    mode,
    setMode,
    handleSearch
  };
}
