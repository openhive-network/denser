import { Entry } from '@transaction/lib/extended-hive.chain';
import { useState } from 'react';
import SuggestionsCard from './card';
import { Button } from '@ui/components';

// FIXME: This is a temporary fix to avoid the error when suggestions is not an array
const SuggestionsList = ({ suggestions }: { suggestions: Entry[] }) => {
  const filteredPosts = suggestions.filter((e) => e.author_reputation >= 50 && !e.stats?.gray);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Entry[]>(
    Array.isArray(suggestions) ? filteredPosts : []
  );

  // Early return if suggestions is not an array
  if (!Array.isArray(suggestions)) {
    return null;
  }

  return (
    <div className="my-4 flex md:flex-col">
      {filteredSuggestions.length > 0 ? (
        filteredSuggestions.map((suggestion, i) => <SuggestionsCard entry={suggestion} key={i} />)
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
