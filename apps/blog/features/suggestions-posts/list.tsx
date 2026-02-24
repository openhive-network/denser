import { Entry } from '@hive/common-hiveio-packages/wax';
import { useState } from 'react';
import SuggestionsCard from './card';
import { Button } from '@ui/components';

interface SuggestionsListProps {
  suggestions: Entry[];
  horizontal?: boolean;
}

const SuggestionsList = ({ suggestions, horizontal }: SuggestionsListProps) => {
  const filteredPosts = suggestions.filter((e) => e.author_reputation >= 50 && !e.stats?.gray);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Entry[]>(
    Array.isArray(suggestions) ? filteredPosts : []
  );

  if (!Array.isArray(suggestions)) {
    return null;
  }

  return (
    <div
      className={
        horizontal
          ? 'flex gap-3 overflow-x-auto px-4 pb-3 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'my-4 flex flex-col'
      }
    >
      {filteredSuggestions.length > 0 ? (
        filteredSuggestions.map((suggestion, i) => (
          <SuggestionsCard entry={suggestion} key={i} horizontal={horizontal} />
        ))
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 text-sm">
          <p>Sorry</p>
          <p>All suggested posts were hidden due to low ratings.</p>
        </div>
      )}
      {filteredPosts.length === 0 ? (
        <Button
          className="w-1/2 self-center"
          onClick={() =>
            filteredSuggestions.length === suggestions.length
              ? setFilteredSuggestions(suggestions.filter((e) => e.author_reputation >= 50 && !e.stats?.gray))
              : setFilteredSuggestions(suggestions)
          }
          variant="outlineRed"
        >
          {filteredSuggestions.length === suggestions.length ? 'Hide' : 'Show All'}
        </Button>
      ) : null}
    </div>
  );
};

export default SuggestionsList;
