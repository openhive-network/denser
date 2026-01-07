import { cache } from 'react';
import { getAccountFull } from '@transaction/lib/hive-api';
import { getPost } from '@transaction/lib/bridge-api';

/**
 * Request-level cached version of getAccountFull.
 * Deduplicates calls within the same request (e.g., generateMetadata + layout).
 */
export const getAccountFullCached = cache(getAccountFull);

/**
 * Request-level cached version of getPost.
 * Deduplicates calls within the same request (e.g., generateMetadata + page).
 */
export const getPostCached = cache(getPost);
