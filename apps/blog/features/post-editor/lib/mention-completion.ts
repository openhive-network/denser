import type { CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete';

/** How many characters of a name follow `@` before lite names are offered. */
export const MENTION_MIN_CHARS = 2;
/** How many lite names are offered at most. */
export const MENTION_MAX_OPTIONS = 10;
/** How long typing must pause before the node is asked. */
export const MENTION_DEBOUNCE_MS = 250;

const LITE_DID_PREFIX = 'did:lite:';
// An `@` that starts a word (not an e-mail address or a path), then the typed part of a lite name,
// optionally written as its DID.
const MENTION_BEFORE_CURSOR = /(?:^|[^\w.@/-])@(?:did:lite:)?[a-z0-9.-]*$/i;

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type MentionSourceOptions = {
  /** The lite accounts whose name starts with the prefix, as DIDs (`lite.lookup_accounts`). */
  lookup: (prefix: string, limit: number) => Promise<string[]>;
  /** The text shown next to each name, e.g. "lite account". */
  detail: string;
  debounceMs?: number;
};

/**
 * A CodeMirror completion source offering lite accounts for an `@` mention: once `@` is followed by
 * `MENTION_MIN_CHARS` characters and typing pauses for `debounceMs`, it asks `lookup` and offers at
 * most `MENTION_MAX_OPTIONS` names; choosing one replaces the typed `@…` with `@did:lite:<name>`.
 * A query the editor aborted meanwhile (more typing) asks nothing.
 */
export function createMentionSource({ lookup, detail, debounceMs = MENTION_DEBOUNCE_MS }: MentionSourceOptions): CompletionSource {
  return async (context: Pick<CompletionContext, 'matchBefore' | 'aborted'>): Promise<CompletionResult | null> => {
    const match = context.matchBefore(MENTION_BEFORE_CURSOR);
    if (!match) return null;
    const at = match.text.indexOf('@');
    let prefix = match.text.slice(at + 1).toLowerCase();
    if (prefix.startsWith(LITE_DID_PREFIX)) prefix = prefix.slice(LITE_DID_PREFIX.length);
    if (prefix.length < MENTION_MIN_CHARS) return null;

    await pause(debounceMs);
    if (context.aborted) return null;
    const dids = await lookup(prefix, MENTION_MAX_OPTIONS);
    if (context.aborted) return null;

    const options = dids
      .filter((did) => did.startsWith(LITE_DID_PREFIX))
      .slice(0, MENTION_MAX_OPTIONS)
      .map((did) => ({ label: did.slice(LITE_DID_PREFIX.length), detail, apply: `@${did}`, type: 'variable' }));
    // The node already matched the prefix: no client-side filtering, and every keystroke asks again.
    return options.length > 0 ? { from: match.from + at, options, filter: false } : null;
  };
}
