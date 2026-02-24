import SuggestionsList from '@/blog/features/suggestions-posts/list';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';

const AnimatedList = ({ suggestions }: { suggestions: Entry[] }) => {
  const { user } = useUserClient();
  const [showSuggestions, storeShowSuggestions] = useStorageWithTTL<boolean>(
    `showSuggestions${user.username ? `-${user.username}` : ''}`,
    true,
    StorageTTL.PERMANENT
  );

  return (
    <div className="md:sticky md:top-24 md:flex md:max-h-[calc(100vh-96px)] md:flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {showSuggestions ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex min-h-0 flex-col"
          >
            <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-1">
              <h2 className="font-sanspro text-lg font-semibold">You Might Also Like</h2>
              <button
                type="button"
                onClick={() => storeShowSuggestions(false)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto">
              <SuggestionsList suggestions={suggestions} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="px-3 pt-1"
          >
            <button
              type="button"
              onClick={() => storeShowSuggestions(true)}
              className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-foreground/20 hover:text-foreground hover:shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Suggestions
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedList;
