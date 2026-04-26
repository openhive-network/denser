import sanitize from 'sanitize-html';
import {createHighlighterCoreSync, type HighlighterCore} from 'shiki/core';
import {createJavaScriptRegexEngine} from 'shiki/engine/javascript';
import langBash from 'shiki/langs/bash.mjs';
import langC from 'shiki/langs/c.mjs';
import langCpp from 'shiki/langs/cpp.mjs';
import langCss from 'shiki/langs/css.mjs';
import langDiff from 'shiki/langs/diff.mjs';
import langDockerfile from 'shiki/langs/dockerfile.mjs';
import langGo from 'shiki/langs/go.mjs';
import langHtml from 'shiki/langs/html.mjs';
import langIni from 'shiki/langs/ini.mjs';
import langJava from 'shiki/langs/java.mjs';
import langJs from 'shiki/langs/javascript.mjs';
import langJson from 'shiki/langs/json.mjs';
import langJsx from 'shiki/langs/jsx.mjs';
import langMarkdown from 'shiki/langs/markdown.mjs';
import langPhp from 'shiki/langs/php.mjs';
import langPython from 'shiki/langs/python.mjs';
import langRuby from 'shiki/langs/ruby.mjs';
import langRust from 'shiki/langs/rust.mjs';
import langScss from 'shiki/langs/scss.mjs';
import langShell from 'shiki/langs/shell.mjs';
import langSql from 'shiki/langs/sql.mjs';
import langToml from 'shiki/langs/toml.mjs';
import langTs from 'shiki/langs/typescript.mjs';
import langTsx from 'shiki/langs/tsx.mjs';
import langXml from 'shiki/langs/xml.mjs';
import langYaml from 'shiki/langs/yaml.mjs';
import themeDark from 'shiki/themes/github-dark.mjs';
import themeLight from 'shiki/themes/github-light.mjs';
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
    '&nbsp;': ' '
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

let highlighterInstance: HighlighterCore | null = null;

function getHighlighter(): HighlighterCore {
    if (!highlighterInstance) {
        highlighterInstance = createHighlighterCoreSync({
            langs: [
                langBash,
                langC,
                langCpp,
                langCss,
                langDiff,
                langDockerfile,
                langGo,
                langHtml,
                langIni,
                langJava,
                langJs,
                langJson,
                langJsx,
                langMarkdown,
                langPhp,
                langPython,
                langRuby,
                langRust,
                langScss,
                langShell,
                langSql,
                langToml,
                langTs,
                langTsx,
                langXml,
                langYaml
            ],
            themes: [themeLight, themeDark],
            engine: createJavaScriptRegexEngine()
        });
    }
    return highlighterInstance;
}

/**
 * Renders fenced code blocks tagged with an explicit language as syntax-highlighted
 * HTML. Runs as a postProcess plugin (after the main sanitizer), then second-pass-
 * sanitizes its own output. Only blocks with a recognized language are touched;
 * untagged blocks are left as plain `<pre><code>`.
 */
export class SyntaxHighlightPlugin implements RendererPlugin {
    public name = 'syntax-highlight-plugin';

    public postProcess(html: string): string {
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
                const highlighted = getHighlighter().codeToHtml(code, {
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
