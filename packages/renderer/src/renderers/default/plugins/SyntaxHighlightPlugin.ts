import sanitize from 'sanitize-html';
import {Log} from '../../../Log';
import type {RendererPlugin} from './RendererPlugin';

/**
 * Maps author-supplied language tags (and common aliases) to Shiki's canonical
 * language id. Only blocks whose class resolves to an entry here are highlighted.
 */
const LANG_ALIASES: Readonly<Record<string, string>> = Object.freeze({
    bash: 'bash',
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    cxx: 'cpp',
    css: 'css',
    diff: 'diff',
    docker: 'dockerfile',
    dockerfile: 'dockerfile',
    go: 'go',
    golang: 'go',
    html: 'html',
    ini: 'ini',
    java: 'java',
    javascript: 'javascript',
    js: 'javascript',
    json: 'json',
    jsx: 'jsx',
    markdown: 'markdown',
    md: 'markdown',
    php: 'php',
    py: 'python',
    python: 'python',
    rb: 'ruby',
    ruby: 'ruby',
    rs: 'rust',
    rust: 'rust',
    scss: 'scss',
    sh: 'shell',
    shell: 'shell',
    sql: 'sql',
    toml: 'toml',
    ts: 'typescript',
    tsx: 'tsx',
    typescript: 'typescript',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    zsh: 'bash'
});

/** Skip highlighting for code blocks larger than this many UTF-16 code units (post-sanitize, pre-decode). */
const MAX_BLOCK_BYTES = 50_000;

/** Match `<pre><code class="language-X">...</code></pre>` produced by remarkable + sanitizer. */
const BLOCK_RE = /<pre><code class="language-([a-z0-9_+-]{1,30})">([\s\S]*?)<\/code><\/pre>/gi;

const HTML_ENTITY_MAP: Readonly<Record<string, string>> = Object.freeze({
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&nbsp;': ' '
});
const HTML_ENTITY_RE = /&(?:lt|gt|amp|quot|nbsp|#39|#x27);/g;

/**
 * Decodes the small set of HTML entities that sanitize-html may emit inside
 * a `<code>` block. We do this single-pass so chained encodings (`&amp;lt;`
 * representing literal `&lt;` in the source) survive correctly.
 */
function decodeEntities(s: string): string {
    return s.replace(HTML_ENTITY_RE, (m) => HTML_ENTITY_MAP[m] ?? m);
}

/**
 * Defense-in-depth re-sanitization of Shiki's output. Shiki's emitted HTML is
 * well-defined, but the highlighter runs after the main sanitizer, so any
 * unexpected output would otherwise reach the user unchecked. This config is
 * scoped tightly to the exact tag/attr/style shape Shiki produces.
 */
const SECOND_PASS_CONFIG: sanitize.IOptions = {
    allowedTags: ['pre', 'code', 'span'],
    allowedAttributes: {
        pre: ['class', 'style', 'tabindex'],
        code: ['class'],
        span: ['class', 'style']
    },
    allowedClasses: {
        pre: ['shiki', 'shiki-themes', /^github-(light|dark)$/],
        span: ['line']
    },
    allowedStyles: {
        '*': {
            '--shiki-light': [/^#[0-9a-fA-F]{3,8}$/],
            '--shiki-dark': [/^#[0-9a-fA-F]{3,8}$/],
            '--shiki-light-bg': [/^#[0-9a-fA-F]{3,8}$/],
            '--shiki-dark-bg': [/^#[0-9a-fA-F]{3,8}$/]
        }
    },
    allowedSchemes: []
};

/**
 * Minimal type stub for Shiki's sync highlighter. Avoids static type imports
 * from `shiki` so the renderer's existing CommonJS test config (ts-node + mocha)
 * can compile this file without tripping on Shiki's ESM-only `exports` map.
 * The full instance comes from `import('shiki/core')` at runtime.
 */
interface ShikiLikeHighlighter {
    codeToHtml(
        code: string,
        options: {
            lang: string;
            themes: {light: string; dark: string};
            defaultColor: false;
        }
    ): string;
}

let highlighter: ShikiLikeHighlighter | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Bypass TypeScript's module-resolution check for Shiki's ESM-only subpaths.
 * The renderer is consumed in two different module contexts:
 * - Production: webpack bundle, ESM-aware, resolves Shiki's `exports` map fine.
 * - Renderer's own mocha test runner: CommonJS / legacy resolution that can't
 *   read Shiki's `exports` map and would fail to compile static imports.
 * Wrapping `import()` in a Function constructor hides the path string from the
 * compiler so neither context tries to statically resolve it; resolution happens
 * at runtime where each environment handles ESM correctly.
 */
const dynImport: (path: string) => Promise<any> =
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('p', 'return import(p)') as (path: string) => Promise<any>;

const SHIKI_LANG_PATHS = [
    'shiki/langs/bash.mjs',
    'shiki/langs/c.mjs',
    'shiki/langs/cpp.mjs',
    'shiki/langs/css.mjs',
    'shiki/langs/diff.mjs',
    'shiki/langs/dockerfile.mjs',
    'shiki/langs/go.mjs',
    'shiki/langs/html.mjs',
    'shiki/langs/ini.mjs',
    'shiki/langs/java.mjs',
    'shiki/langs/javascript.mjs',
    'shiki/langs/json.mjs',
    'shiki/langs/jsx.mjs',
    'shiki/langs/markdown.mjs',
    'shiki/langs/php.mjs',
    'shiki/langs/python.mjs',
    'shiki/langs/ruby.mjs',
    'shiki/langs/rust.mjs',
    'shiki/langs/scss.mjs',
    'shiki/langs/shell.mjs',
    'shiki/langs/sql.mjs',
    'shiki/langs/toml.mjs',
    'shiki/langs/typescript.mjs',
    'shiki/langs/tsx.mjs',
    'shiki/langs/xml.mjs',
    'shiki/langs/yaml.mjs'
] as const;

/**
 * Lazily loads Shiki and builds a singleton highlighter. Uses dynamic import
 * so this module remains loadable from CommonJS callers (the renderer's mocha
 * test runner) while still resolving Shiki's ESM-only `exports` map at
 * runtime in production (Node 20.x dynamic import handles ESM from CJS).
 */
function ensureHighlighter(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        const [coreMod, engineMod, lightTheme, darkTheme, ...langMods] = await Promise.all([
            dynImport('shiki/core'),
            dynImport('shiki/engine/javascript'),
            dynImport('shiki/themes/github-light.mjs'),
            dynImport('shiki/themes/github-dark.mjs'),
            ...SHIKI_LANG_PATHS.map((p) => dynImport(p))
        ]);
        const langs = langMods.map((m) => m.default).filter(Boolean);
        highlighter = coreMod.createHighlighterCoreSync({
            langs,
            themes: [lightTheme.default, darkTheme.default],
            engine: engineMod.createJavaScriptRegexEngine()
        });
    })().catch((err) => {
        Log.log().warn({err}, 'syntax-highlight-plugin: Shiki initialization failed');
    });
    return initPromise;
}

/**
 * Renders fenced code blocks tagged with an explicit language as syntax-highlighted
 * HTML. Runs as a postProcess plugin (after the main sanitizer), then second-pass-
 * sanitizes its own output. Only blocks with a recognized language are touched;
 * untagged blocks are left as plain `<pre><code>`.
 *
 * Initialization is lazy: the first instance kicks off Shiki loading in the
 * background. Renders that occur before initialization completes are passed
 * through unchanged. Once loaded, the singleton highlighter is reused for the
 * lifetime of the process.
 */
export class SyntaxHighlightPlugin implements RendererPlugin {
    public name = 'syntax-highlight-plugin';

    public constructor() {
        // Fire-and-forget: kick off Shiki load. Errors are logged inside ensureHighlighter.
        void ensureHighlighter();
    }

    /** Resolves once Shiki is ready (or has definitively failed to load). */
    public ready(): Promise<void> {
        return ensureHighlighter();
    }

    public postProcess(html: string): string {
        if (!highlighter) {
            return html;
        }
        if (!html.includes('<pre><code class="language-')) {
            return html;
        }
        return html.replace(BLOCK_RE, (match, langTag: string, encodedText: string) => {
            const canonicalLang = LANG_ALIASES[langTag.toLowerCase()];
            if (!canonicalLang) {
                return match;
            }
            if (encodedText.length > MAX_BLOCK_BYTES) {
                return match;
            }
            try {
                const code = decodeEntities(encodedText);
                const highlighted = highlighter!.codeToHtml(code, {
                    lang: canonicalLang,
                    themes: {light: 'github-light', dark: 'github-dark'},
                    defaultColor: false
                });
                return sanitize(highlighted, SECOND_PASS_CONFIG);
            } catch (err) {
                Log.log().warn({err, lang: canonicalLang}, 'syntax-highlight-plugin: highlight failed, falling back to plain');
                return match;
            }
        });
    }
}
