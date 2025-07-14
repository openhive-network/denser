import { SearchMode } from '@ui/hooks/useSearch';

export const getPlaceholder = (value: SearchMode) => {
  switch (value) {
    case 'ai':
      return 'AI Search...';
    case 'classic':
      return 'Search...';
    case 'users':
      return 'Search users...';
    case 'userTopics':
      return 'Username...';
    case 'tags':
      return 'Search tags...';
    case 'community':
      return 'Search community...';
    default:
      return 'Search something...';
  }
};
