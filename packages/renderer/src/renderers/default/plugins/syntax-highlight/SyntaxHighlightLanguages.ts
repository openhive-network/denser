/**
 * Author-supplied fence languages (lower-cased, aliases included) mapped to the Shiki grammar
 * that highlights them. A block whose language is not a key here stays plain: there is no
 * auto-detection. ShikiHighlighter loads exactly the grammars named on the right-hand side.
 */
export const HIGHLIGHT_LANGUAGES: Readonly<Record<string, string>> = Object.freeze({
    bash: 'shellscript',
    c: 'c',
    'c++': 'cpp',
    cpp: 'cpp',
    css: 'css',
    cxx: 'cpp',
    diff: 'diff',
    docker: 'docker',
    dockerfile: 'docker',
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
    rs: 'rust',
    ruby: 'ruby',
    rust: 'rust',
    scss: 'scss',
    sh: 'shellscript',
    shell: 'shellscript',
    sql: 'sql',
    toml: 'toml',
    ts: 'typescript',
    tsx: 'tsx',
    typescript: 'typescript',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    zsh: 'shellscript'
});

/** The Shiki grammar for a fence language, or undefined when it is not highlighted. */
export function resolveHighlightLanguage(fenceLanguage: string): string | undefined {
    const key = fenceLanguage.toLowerCase();
    return Object.prototype.hasOwnProperty.call(HIGHLIGHT_LANGUAGES, key) ? HIGHLIGHT_LANGUAGES[key] : undefined;
}
