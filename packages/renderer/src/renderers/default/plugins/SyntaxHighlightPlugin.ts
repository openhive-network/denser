import sanitize from 'sanitize-html';
import {Log} from '../../../Log';
import type {RendererPlugin} from './RendererPlugin';
import {HighlightCache} from './syntax-highlight/HighlightCache';
import {type CodeHighlighter, getSyntaxHighlighter} from './syntax-highlight/SyntaxHighlighterLoader';
import {resolveHighlightLanguage} from './syntax-highlight/SyntaxHighlightLanguages';

/** A block whose decoded source is larger than this many UTF-8 bytes stays plain. */
const MAX_HIGHLIGHTED_BLOCK_UTF8_BYTES = 16 * 1024;

const MAX_CACHED_BLOCKS = 512;
/** Total size of the cache's keys (sources) and values (highlighted HTML), in UTF-16 code units. */
const MAX_CACHED_CODE_UNITS = 8 * 1024 * 1024;

const BLOCK_MARKER = '<pre><code class="language-';

/**
 * A fenced block as remarkable and the main sanitizer emit it (TagTransformingSanitizer keeps only
 * a lower-case `language-X` class on `<code>`). `[^<]*` leaves out a block holding any element:
 * its text would not be the author's source. A new regex per call: a global one keeps `lastIndex`.
 */
const blockPattern = (): RegExp => /<pre><code class="language-([a-z0-9_+-]{1,30})">([^<]*)<\/code><\/pre>/g;

const HTML_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&nbsp;': ' '
});
const HTML_ENTITY_PATTERN = /&(?:lt|gt|amp|quot|nbsp|#39|#x27);/g;

/** Decodes the entities the sanitizer emits in text, in one pass so `&amp;lt;` stays a literal `&lt;`. */
function decodeEntities(text: string): string {
    return text.replace(HTML_ENTITY_PATTERN, (entity) => HTML_ENTITIES[entity] ?? entity);
}

function fitsHighlightLimit(code: string): boolean {
    // A UTF-16 code unit takes at least one UTF-8 byte: skip encoding a block that is surely too big.
    if (code.length > MAX_HIGHLIGHTED_BLOCK_UTF8_BYTES) return false;
    return new TextEncoder().encode(code).length <= MAX_HIGHLIGHTED_BLOCK_UTF8_BYTES;
}

const SHIKI_COLOR = [/^#[0-9a-fA-F]{3,8}$/];

/**
 * Second pass over Shiki's output, which is produced after the main sanitizer: exactly the tags,
 * classes and colour custom properties Shiki emits, nothing else.
 */
const SHIKI_OUTPUT_SANITIZE_CONFIG: sanitize.IOptions = {
    allowedTags: ['pre', 'code', 'span'],
    allowedAttributes: {
        pre: ['class', 'style', 'tabindex'],
        code: [],
        span: ['class', 'style']
    },
    allowedClasses: {
        pre: ['shiki', 'shiki-themes', /^github-(light|dark)$/],
        span: ['line']
    },
    allowedStyles: {
        '*': {
            '--shiki-light': SHIKI_COLOR,
            '--shiki-dark': SHIKI_COLOR,
            '--shiki-light-bg': SHIKI_COLOR,
            '--shiki-dark-bg': SHIKI_COLOR,
            '--shiki-light-font-style': [/^(italic|normal)$/],
            '--shiki-dark-font-style': [/^(italic|normal)$/],
            '--shiki-light-font-weight': [/^(bold|normal)$/],
            '--shiki-dark-font-weight': [/^(bold|normal)$/]
        }
    },
    allowedSchemes: []
};

interface CodeBlock {
    lang: string;
    code: string;
}

/** The block a blockPattern match stands for, when it is one to highlight. */
function toHighlightableBlock(fenceLanguage: string, encodedCode: string): CodeBlock | undefined {
    const lang = resolveHighlightLanguage(fenceLanguage);
    if (!lang) return undefined;
    const code = decodeEntities(encodedCode);
    return fitsHighlightLimit(code) ? {lang, code} : undefined;
}

/**
 * Whether rendered `html` holds a fenced block SyntaxHighlightPlugin would highlight: one tagged
 * with a supported language, within the size limit. Callers use it to load the highlighter
 * (loadSyntaxHighlighter) only for bodies that need it.
 */
export function containsHighlightableCode(html: string): boolean {
    if (!html.includes(BLOCK_MARKER)) return false;
    const pattern = blockPattern();
    for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
        if (toHighlightableBlock(match[1], match[2])) return true;
    }
    return false;
}

/**
 * Highlights fenced code blocks tagged with a supported language (SyntaxHighlightLanguages).
 * Runs as a postProcess step after the main sanitizer and sanitizes its own output again.
 * Untagged blocks, other languages, oversized blocks and inline code stay plain, and so does a
 * block that fails to highlight.
 *
 * Highlights only once the highlighter is loaded (loadSyntaxHighlighter); until then it returns
 * its input. Highlighted blocks are cached by language and source.
 */
export class SyntaxHighlightPlugin implements RendererPlugin {
    public name = 'syntax-highlight-plugin';

    private readonly cache = new HighlightCache(MAX_CACHED_BLOCKS, MAX_CACHED_CODE_UNITS);

    /** @param getHighlighter - the highlighter to use, undefined while it is not loaded */
    public constructor(private readonly getHighlighter: () => CodeHighlighter | undefined = getSyntaxHighlighter) {}

    // An arrow function: DefaultRenderer calls plugin phases unbound.
    public postProcess = (html: string): string => {
        if (!html.includes(BLOCK_MARKER)) return html;
        const highlighter = this.getHighlighter();
        if (!highlighter) return html;
        return html.replace(blockPattern(), (block: string, fenceLanguage: string, encodedCode: string) => {
            const highlightable = toHighlightableBlock(fenceLanguage, encodedCode);
            return (highlightable && this.highlight(highlighter, highlightable)) || block;
        });
    };

    private highlight(highlighter: CodeHighlighter, {lang, code}: CodeBlock): string | null {
        const cached = this.cache.get(lang, code);
        if (cached !== undefined) return cached;
        let highlighted: string | null;
        try {
            highlighted = sanitize(highlighter.codeToHtml(code, lang), SHIKI_OUTPUT_SANITIZE_CONFIG);
        } catch (err) {
            Log.log().warn({err, lang}, 'syntax-highlight-plugin: highlighting failed, the block stays plain');
            highlighted = null;
        }
        this.cache.set(lang, code, highlighted);
        return highlighted;
    }
}
