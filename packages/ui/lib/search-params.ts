import { z } from 'zod';

/**
 * Validates a Hive account name format for search purposes.
 * This is a simplified check to avoid wasted API calls on obviously invalid usernames.
 * Full validation (bad actor lists, etc.) happens elsewhere.
 */
const hiveAccountSchema = z
  .string()
  .min(3, 'Account name must be at least 3 characters')
  .max(16, 'Account name must be at most 16 characters')
  .regex(/^[a-z]/, 'Account name must start with a letter')
  .regex(/^[a-z0-9.-]+$/, 'Account name can only contain lowercase letters, numbers, dots, and hyphens')
  .regex(/[a-z0-9]$/, 'Account name must end with a letter or number')
  .refine((val) => !val.includes('--'), 'Account name cannot contain consecutive hyphens');

/**
 * Schema for validating search page URL parameters.
 * Ensures parameters are within reasonable bounds before making API calls.
 */
export const searchParamsSchema = z.object({
  q: z.string().max(500, 'Search query too long').optional(),
  ai: z.string().max(500, 'Search query too long').optional(),
  a: hiveAccountSchema.optional(),
  p: z.string().max(500, 'Topic pattern too long').optional(),
  s: z.enum(['relevance', 'created']).optional()
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/**
 * Parses and validates search parameters from URL.
 * Returns validated params or null values for invalid fields.
 */
export function parseSearchParams(params: Record<string, string | string[] | undefined>): SearchParams {
  const normalized = {
    q: typeof params.q === 'string' ? params.q : undefined,
    ai: typeof params.ai === 'string' ? params.ai : undefined,
    a: typeof params.a === 'string' ? params.a : undefined,
    p: typeof params.p === 'string' ? params.p : undefined,
    s: typeof params.s === 'string' ? params.s : undefined
  };

  const result = searchParamsSchema.safeParse(normalized);

  if (result.success) {
    return result.data;
  }

  // Return only valid fields, omit invalid ones
  const validParams: SearchParams = {};
  const errors = result.error.flatten().fieldErrors;

  if (!errors.q && normalized.q) validParams.q = normalized.q;
  if (!errors.ai && normalized.ai) validParams.ai = normalized.ai;
  if (!errors.a && normalized.a) validParams.a = normalized.a;
  if (!errors.p && normalized.p) validParams.p = normalized.p;
  if (!errors.s && (normalized.s === 'relevance' || normalized.s === 'created')) {
    validParams.s = normalized.s;
  }

  return validParams;
}
