import {createHighlighterCoreSync} from 'shiki/core';
import {createJavaScriptRegexEngine} from 'shiki/engine/javascript';
import c from 'shiki/langs/c.mjs';
import cpp from 'shiki/langs/cpp.mjs';
import css from 'shiki/langs/css.mjs';
import diff from 'shiki/langs/diff.mjs';
import docker from 'shiki/langs/docker.mjs';
import go from 'shiki/langs/go.mjs';
import html from 'shiki/langs/html.mjs';
import ini from 'shiki/langs/ini.mjs';
import java from 'shiki/langs/java.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import jsx from 'shiki/langs/jsx.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import php from 'shiki/langs/php.mjs';
import python from 'shiki/langs/python.mjs';
import ruby from 'shiki/langs/ruby.mjs';
import rust from 'shiki/langs/rust.mjs';
import scss from 'shiki/langs/scss.mjs';
import shellscript from 'shiki/langs/shellscript.mjs';
import sql from 'shiki/langs/sql.mjs';
import toml from 'shiki/langs/toml.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import xml from 'shiki/langs/xml.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';
import type {CodeHighlighter} from './SyntaxHighlighterLoader';

/**
 * Shiki's grammars are named one by one (no `shiki` bundle import), so only these reach the
 * client chunk and the server's traced files. Keep in sync with SyntaxHighlightLanguages.
 */
const GRAMMARS = [
    c,
    cpp,
    css,
    diff,
    docker,
    go,
    html,
    ini,
    java,
    javascript,
    json,
    jsx,
    markdown,
    php,
    python,
    ruby,
    rust,
    scss,
    shellscript,
    sql,
    toml,
    tsx,
    typescript,
    xml,
    yaml
];

/** A line longer than this many UTF-16 code units is emitted untokenized, bounding regex work per line. */
const MAX_TOKENIZED_LINE_LENGTH = 1_000;

/**
 * Builds the highlighter: the JavaScript regex engine (no WASM), both GitHub themes emitted as
 * `--shiki-light`/`--shiki-dark` custom properties (`defaultColor: false`), so one render serves
 * either colour scheme.
 */
export function createShikiHighlighter(): CodeHighlighter {
    const highlighter = createHighlighterCoreSync({
        langs: GRAMMARS,
        themes: [githubLight, githubDark],
        engine: createJavaScriptRegexEngine()
    });
    return {
        codeToHtml: (code, lang) =>
            highlighter.codeToHtml(code, {
                lang,
                themes: {light: 'github-light', dark: 'github-dark'},
                defaultColor: false,
                tokenizeMaxLineLength: MAX_TOKENIZED_LINE_LENGTH
            })
    };
}
