import { SearchMode } from '@ui/hooks/use-search';
import { Select, CustomSelectContent, CustomSelectItem, SelectTrigger, SelectValue } from './select';
import { Bot, Hash, Search, User } from 'lucide-react';
import type { TFunction } from 'i18next';

const MODE_LABEL_KEYS: Record<SearchMode, string> = {
  classic: 'search_mode.mode.classic',
  ai: 'search_mode.mode.ai',
  account: 'search_mode.mode.account',
  userTopic: 'search_mode.mode.user_topic',
  tag: 'search_mode.mode.tag'
};

const ModeLabel = ({ mode, t }: { mode: SearchMode; t: TFunction }) => (
  <span className="sr-only">{t(MODE_LABEL_KEYS[mode])}</span>
);

const ModeSelect = ({
  handleMode,
  mode,
  aiAvailable,
  t
}: {
  handleMode: (value: SearchMode) => void;
  mode: SearchMode;
  aiAvailable: boolean;
  t: TFunction;
}) => {
  return (
    <Select value={mode} onValueChange={handleMode}>
      <SelectTrigger
        className="w-fit rounded-full"
        aria-label={t('search_mode.select_label', {
          mode: t(MODE_LABEL_KEYS[mode]),
          interpolation: { escapeValue: false }
        })}
      >
        <SelectValue />
      </SelectTrigger>
      <CustomSelectContent className="w-fit min-w-fit">
        <CustomSelectItem value="classic" className="p-2" data-testid="search-mode-classic">
          <Search className="h-4 w-4" aria-hidden="true" />
          <ModeLabel mode="classic" t={t} />
        </CustomSelectItem>
        <CustomSelectItem value="ai" className="w-fit p-2" disabled={!aiAvailable} data-testid="search-mode-ai">
          <Bot className="h-4 w-4" aria-hidden="true" />
          <ModeLabel mode="ai" t={t} />
        </CustomSelectItem>
        <CustomSelectItem value="account" className="p-2" data-testid="search-mode-account">
          <User className="h-4 w-4" aria-hidden="true" />
          <ModeLabel mode="account" t={t} />
        </CustomSelectItem>
        <CustomSelectItem value="userTopic" className="p-2" data-testid="search-mode-user-topic">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M11.5 15H7a4 4 0 0 0-4 4v2" />
            <path d="M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
            <circle cx="10" cy="7" r="4" />
          </svg>
          <ModeLabel mode="userTopic" t={t} />
        </CustomSelectItem>
        <CustomSelectItem value="tag" className="p-2" data-testid="search-mode-tag">
          <Hash className="h-4 w-4" aria-hidden="true" />
          <ModeLabel mode="tag" t={t} />
        </CustomSelectItem>
      </CustomSelectContent>
    </Select>
  );
};
export default ModeSelect;
