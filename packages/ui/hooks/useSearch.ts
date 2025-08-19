import { useRouter } from 'next/router';
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
  const router = useRouter();
  const query = router.query.q as string;
  const aiQuery = router.query.ai as string;
  const userTopicQuery = router.query.a as string;
  const topicQuery = router.query.p as string;
  const sortQuery = router.query.s as SearchSort | undefined;

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
      case 'tag':
        router.push(`trending/${encodeURIComponent(value)}`);
        break;
      case 'account':
        router.push(`@${encodeURIComponent(value)}`);
        break;
      case 'ai':
        router.push(`/search?ai=${encodeURIComponent(value)}`);
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
