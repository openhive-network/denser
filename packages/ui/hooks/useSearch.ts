import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export type SearchMode = 'ai' | 'users' | 'userTopics' | 'tags' | 'community' | 'classic';

export function useSearch(aiAvailable: boolean) {
  const router = useRouter();
  const query = router.query.q as string;
  const secondQuery = router.query.p as string;
  const aiQuery = router.query.ai as string;
  const [inputValue, setInputValue] = useState(query ?? aiQuery ?? '');
  const [secondInputValue, setSecondInputValue] = useState(secondQuery ?? '');
  const [mode, setMode] = useState<SearchMode>(!aiAvailable ? 'classic' : 'ai');

  useEffect(() => {
    if (aiAvailable) {
      setMode('ai');
    }
  }, [aiAvailable]);

  const handleSearch = (value: string, currentMode: SearchMode) => {
    switch (currentMode) {
      case 'ai':
        router.push(`/search?ai=${encodeURIComponent(value)}`);
        break;
      case 'users':
        router.push(`@${encodeURIComponent(value)}`);
        break;
      case 'userTopics':
        router.push(`/search?a=${encodeURIComponent(value)}&p=${encodeURIComponent(secondInputValue)}`);
        break;
      case 'tags':
        router.push(`trending/${encodeURIComponent(value)}`);
        break;
      case 'community':
        router.push(`trending/${encodeURIComponent(value)}`);
        break;
      case 'classic':
        router.push(`/search?q=${encodeURIComponent(value)}&s=trending`);
        break;
      default:
        router.push(`/search?q=${encodeURIComponent(value)}&s=trending`);
        break;
    }
  };

  return {
    inputValue,
    setInputValue,
    secondInputValue,
    setSecondInputValue,
    mode,
    setMode,
    handleSearch
  };
}
