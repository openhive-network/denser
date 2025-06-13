import { Entry } from '@transaction/lib/extended-hive.chain'; 
import { useState } from 'react';
import SuggestionsCard from './suggestions-card';
import { Button } from '@ui/components';

const SuggestionsList = ({ suggestions }: { suggestions: Entry[] }) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<Entry[]>(
    suggestions.filter((e) => e.author_reputation >= 50 && !e.stats?.gray)
  );
  return (
    <div className="flex md:flex-col">
      {filteredSuggestions.length > 0 ? (
        filteredSuggestions.map((suggestion, i) => <SuggestionsCard entry={suggestion} key={i} />)
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 text-sm">
          <p>Sorry</p>
          <p>All suggested posts were hidden due to low ratings.</p>
          <Button onClick={() => setFilteredSuggestions(suggestions)} variant="outlineRed">
            Show
          </Button>
        </div>
      )}
    </div>
  );
};

export default SuggestionsList;
