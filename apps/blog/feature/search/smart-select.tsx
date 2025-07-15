import { Bot, Search, AtSign, Hash, PersonStanding } from 'lucide-react';
import { SearchMode } from '@ui/hooks/useSearch';
import { SelectContent, SelectItem, SelectTrigger } from './select';
import { Select, SelectGroup, SelectValue } from '@ui/components';

const SmartSelect = ({
  value,
  onValueChange,
  aiDisabled
}: {
  value: SearchMode;
  onValueChange: (value: SearchMode) => void;
  aiDisabled?: boolean;
}) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 w-fit rounded-l-full border-r-0 border-destructive">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="ai" disabled={aiDisabled}>
            <Bot />
          </SelectItem>
          <SelectItem value="classic">
            <Search />
          </SelectItem>
          <SelectItem value="users">
            <AtSign />
          </SelectItem>
          <SelectItem value="userTopics" disabled={true}>
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
            >
              <path d="M22 2 2 22" />
            </svg>
          </SelectItem>
          <SelectItem value="tags">
            <Hash />
          </SelectItem>
          <SelectItem value="community">
            <PersonStanding />
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
export default SmartSelect;
