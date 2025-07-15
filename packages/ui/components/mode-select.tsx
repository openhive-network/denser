import { SearchMode } from '@ui/hooks/useSearch';
import { Select, CustomSelectContent, CustomSelectItem, SelectTrigger, SelectValue } from './select';
import { Bot, Hash, Search, User } from 'lucide-react';

const ModeSelect = ({ handleMode, mode }: { handleMode: (value: SearchMode) => void; mode: SearchMode }) => {
  return (
    <Select value={mode} onValueChange={handleMode}>
      <SelectTrigger className="w-fit rounded-full">
        <SelectValue />
      </SelectTrigger>
      <CustomSelectContent className="w-fit min-w-fit">
        <CustomSelectItem value="classic" className="p-2">
          <Search className="h-4 w-4" />
        </CustomSelectItem>
        <CustomSelectItem value="ai" className="w-fit p-2">
          <Bot className="h-4 w-4" />
        </CustomSelectItem>
        <CustomSelectItem value="account" className="p-2">
          <User className="h-4 w-4" />
        </CustomSelectItem>
        <CustomSelectItem value="userTopic" className="p-2">
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
            className="h-4 w-4"
          >
            <path d="M11.5 15H7a4 4 0 0 0-4 4v2" />
            <path d="M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
            <circle cx="10" cy="7" r="4" />
          </svg>
        </CustomSelectItem>
        <CustomSelectItem value="tag" className="p-2">
          <Hash className="h-4 w-4" />
        </CustomSelectItem>
      </CustomSelectContent>
    </Select>
  );
};
export default ModeSelect;
