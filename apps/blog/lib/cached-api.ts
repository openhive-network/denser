import { cache } from 'react';
import { getPost } from '@transaction/lib/bridge-api';

/**
 * Request-level cached version of getPost.
 * Deduplicates calls within the same request (e.g., generateMetadata + page).
 */
export const getPostCached = cache(getPost);
