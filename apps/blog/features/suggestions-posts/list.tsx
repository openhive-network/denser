import { Entry } from '@hive/common-hiveio-packages/wax';
import { useState } from 'react';
import SuggestionsCard from './card';
import { Button } from '@ui/components';
import { useTranslation } from '@/blog/i18n/client';

const MIN_SUGGESTION_REPUTATION = 50;

interface SuggestionsListProps {
  suggestions: Entry[];
  horizontal?: boolean;
}

const isWellRated = (entry: Entry) => entry.author_reputation >= MIN_SUGGESTION_REPUTATION && !entry.stats?.gray;

const SuggestionsList = ({ suggestions, horizontal }: SuggestionsListProps) => {
  const { t } = useTranslation('common_blog');
  const [showAll, setShowAll] = useState(false);

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return null;
  }

  const wellRated = suggestions.filter(isWellRated);
  const allHidden = wellRated.length === 0;
  const visible = showAll ? suggestions : wellRated;

  const toggleShowAll = () => setShowAll((prev) => !prev);

  return (
    <div
      data-testid="suggestions-list"
      className={
        horizontal
          ? 'flex gap-3 overflow-x-auto px-4 pb-3 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'my-4 flex flex-col'
      }
    >
      {visible.length > 0 ? (
        visible.map((suggestion) => (
          <SuggestionsCard
            entry={suggestion}
            key={`${suggestion.author}/${suggestion.permlink}`}
            horizontal={horizontal}
          />
        ))
      ) : (
        <div data-testid="suggestions-all-hidden" className="flex flex-col items-center gap-2 p-4 text-sm">
          <p>{t('post_content.suggestions.sorry')}</p>
          <p>{t('post_content.suggestions.all_hidden_low_ratings')}</p>
        </div>
      )}
      {allHidden ? (
        <Button
          data-testid="suggestions-toggle"
          className="w-1/2 self-center"
          onClick={toggleShowAll}
          variant="outlineRed"
        >
          {showAll ? t('post_content.suggestions.hide') : t('post_content.suggestions.show_all')}
        </Button>
      ) : null}
    </div>
  );
};

export default SuggestionsList;
