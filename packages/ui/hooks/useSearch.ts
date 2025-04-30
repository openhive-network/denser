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
    const searchParams =
      currentMode === 'search'
        ? `q=${encodeURIComponent(value)}&s=${sort ?? 'newest'}`
        : `q=${encodeURIComponent(value)}`;
    router.push(`/search?${searchParams}`);
  };

  return {
    inputValue,
    setInputValue,
    mode,
    setMode,
    handleSearch
  };
}
