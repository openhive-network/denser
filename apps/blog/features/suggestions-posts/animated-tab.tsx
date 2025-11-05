import SuggestionsList from '@/blog/features/suggestions-posts/list';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/components';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowBigLeftDash, ArrowBigRightDash } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';

const AnimatedList = ({ suggestions }: { suggestions: Entry[] }) => {
  const { user } = useUserClient();
  const [showSuggestions, storeShowSuggestions] = useLocalStorage<Boolean>(
    `showSuggestions-/${user.username}`,
    true
  );
  return (
    <AnimatePresence>
      <TooltipProvider>
        {showSuggestions ? (
          <motion.div
            className="flex flex-col overflow-x-auto overflow-y-auto md:sticky md:top-24 md:max-h-[calc(100vh-96px)]"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          >
            <div className="flex">
              <h2 className="mb-4 mt-2 pl-4 font-sanspro text-xl font-bold md:mt-0">You Might Also Like</h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => storeShowSuggestions(false)} variant="ghost" className="w-fit p-0">
                    <ArrowBigLeftDash />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hide Suggestions</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <SuggestionsList suggestions={suggestions} />
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col overflow-x-auto overflow-y-auto md:sticky md:top-24 md:max-h-[calc(100vh-96px)]"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 70, damping: 20 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => storeShowSuggestions(true)} variant="ghost" className="w-fit">
                  <ArrowBigRightDash />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show Suggestions</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </TooltipProvider>
    </AnimatePresence>
  );
};

export default AnimatedList;
