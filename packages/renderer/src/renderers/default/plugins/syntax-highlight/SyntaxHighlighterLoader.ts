import {Log} from '../../../../Log';
import {HIGHLIGHT_LANGUAGES} from './SyntaxHighlightLanguages';

/** Highlights one block of source code; returns Shiki's `<pre class="shiki …">` HTML. Throws on failure. */
export interface CodeHighlighter {
    codeToHtml(code: string, lang: string): string;
}

interface HighlighterRegistry {
    highlighter?: CodeHighlighter;
    loading?: Promise<boolean>;
}

/*
 * Kept on globalThis, not in module scope: on the server Next.js bundles instrumentation (which
 * loads the highlighter at startup) and the routes (which render) as separate module graphs, each
 * with its own copy of this module.
 */
const REGISTRY_KEY = Symbol.for('@hive/renderer/syntax-highlighter');

function getRegistry(): HighlighterRegistry {
    const globalScope = globalThis as typeof globalThis & {[REGISTRY_KEY]?: HighlighterRegistry};
    globalScope[REGISTRY_KEY] ??= {};
    return globalScope[REGISTRY_KEY];
}

/** The loaded highlighter, or undefined until loadSyntaxHighlighter has resolved true. */
export function getSyntaxHighlighter(): CodeHighlighter | undefined {
    return getRegistry().highlighter;
}

/**
 * Loads Shiki (a separate chunk in a bundle) and makes it the highlighter SyntaxHighlightPlugin
 * uses. Resolves true once it is ready, false when loading failed (logged; a later call retries).
 * Concurrent and repeated calls share one load.
 */
export function loadSyntaxHighlighter(): Promise<boolean> {
    const registry = getRegistry();
    if (registry.highlighter) return Promise.resolve(true);
    registry.loading ??= import('./ShikiHighlighter')
        .then(({createShikiHighlighter}) => {
            registry.highlighter = createShikiHighlighter();
            return true;
        })
        .catch((err: unknown) => {
            Log.log().warn({err}, 'syntax-highlight-plugin: loading Shiki failed, code blocks stay plain');
            registry.loading = undefined;
            return false;
        });
    return registry.loading;
}

const WARM_UP_SAMPLE = 'x = 1\n';

/**
 * Compiles every grammar of the loaded highlighter (no-op before it is loaded). A grammar is
 * otherwise compiled by its first block, which for C++ costs about a second of CPU.
 */
export function warmUpSyntaxHighlighter(): void {
    const {highlighter} = getRegistry();
    if (!highlighter) return;
    for (const lang of new Set(Object.values(HIGHLIGHT_LANGUAGES))) {
        highlighter.codeToHtml(WARM_UP_SAMPLE, lang);
    }
}
