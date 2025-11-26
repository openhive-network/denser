import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export type SearchMode = 'ai' | 'classic' | 'account' | 'userTopic' | 'tag';
export type SearchSort = 'created' | 'relevance';

const getMode = (
  query: string | undefined,
  aiQuery: string | undefined,
  userTopicQuery: string | undefined
) => {
  if (!!aiQuery) return 'ai';
  if (!!query) return 'classic';
  if (!!userTopicQuery) return 'userTopic';
};

export function useSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams?.get('q') ?? undefined;
  const aiQuery = searchParams?.get('ai') ?? undefined;
  const userTopicQuery = searchParams?.get('a') ?? undefined;
  const topicQuery = searchParams?.get('p') ?? undefined;
  const sortQuery = searchParams?.get('s') ?? undefined;

  const currentMode = getMode(query, aiQuery, userTopicQuery);
  const [inputValue, setInputValue] = useState(query ?? aiQuery ?? topicQuery ?? '');
  const [mode, setMode] = useState<SearchMode>(currentMode ?? 'ai');
  const [secondInputValue, setSecondInputValue] = useState(userTopicQuery ?? '');
  useEffect(() => {
    if (inputValue.startsWith('/')) {
      setMode('userTopic');
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
      setMode('account');
      setInputValue(inputValue.slice(1));
    }
    if (inputValue.startsWith('#')) {
      setMode('tag');
      setInputValue(inputValue.slice(1));
    }
  }, [inputValue]);

  const handleSearch = (
    value: string,
    currentMode: SearchMode,
    secondValue?: string,
    currenySort?: SearchSort
  ) => {
    if (!value) return;
    switch (currentMode) {
      case 'account':
        router.push(`/@${encodeURIComponent(value)}`);
        break;
      case 'ai':
        router.push(`/search?ai=${encodeURIComponent(value)}`);
        break;
      case 'tag':
        router.push(`/trending/${encodeURIComponent(value)}`);
        break;
      case 'userTopic':
        router.push(
          `/search?a=${encodeURIComponent(value)}&p=${encodeURIComponent(secondValue ?? '')}&s=${currenySort ?? sortQuery ?? 'relevance'}`
        );
        break;
      case 'classic':
        router.push(`/search?q=${encodeURIComponent(value)}&s=${currenySort ?? sortQuery ?? 'relevance'}`);
        break;
    }
  };

  return {
    inputValue,
    setInputValue,
    mode,
    setMode,
    secondInputValue,
    setSecondInputValue,
    handleSearch,
    sortQuery
  };
}
