import * as fs from 'fs';
import * as path from 'path';
import {expect} from 'chai';
import 'mocha';
import {DefaultRenderer, type RendererOptions} from '../DefaultRenderer';
import {type CodeHighlighter, getSyntaxHighlighter, loadSyntaxHighlighter} from './syntax-highlight/SyntaxHighlighterLoader';
import {HIGHLIGHT_LANGUAGES} from './syntax-highlight/SyntaxHighlightLanguages';
import {SyntaxHighlightPlugin, containsHighlightableCode} from './SyntaxHighlightPlugin';

const XSS_PAYLOAD_DIR = path.join(__dirname, '../../../../test-data/xss-payloads');

function loadXssPayloads(): string[] {
    return fs
        .readdirSync(XSS_PAYLOAD_DIR)
        .filter((file) => file.endsWith('.json'))
        .flatMap((file) => JSON.parse(fs.readFileSync(path.join(XSS_PAYLOAD_DIR, file), 'utf-8')).payloads)
        .map(({payload}: {payload: string}) => payload);
}

interface ParsedTag {
    tag: string;
    name: string;
    attributes: Record<string, string>;
}

/** The tags of sanitized `html`, whose attribute values hold no raw `>` (the sanitizer escapes it). */
function parseTags(html: string): ParsedTag[] {
    return (html.match(/<[a-z][a-z0-9]*[^>]*>/gi) ?? []).map((tag) => {
        const attributes: Record<string, string> = {};
        for (const [, attribute, value] of tag.matchAll(/\s([a-z][a-z0-9:-]*)(?:="([^"]*)")?/gi)) {
            attributes[attribute.toLowerCase()] = value ?? '';
        }
        return {tag, name: (/^<([a-z0-9]+)/i.exec(tag)?.[1] ?? '').toLowerCase(), attributes};
    });
}

/** What may never reach the output: script tags, event handlers, javascript: URLs. */
function findActiveMarkup(html: string): string[] {
    return parseTags(html).flatMap(({tag, name, attributes}) => [
        ...(name === 'script' ? [`script: ${tag}`] : []),
        ...Object.keys(attributes)
            .filter((attribute) => attribute.startsWith('on'))
            .map((attribute) => `handler ${attribute}: ${tag}`),
        ...['href', 'src'].filter((attribute) => /^\s*javascript:/i.test(attributes[attribute] ?? '')).map((attribute) => `javascript: in ${attribute}: ${tag}`)
    ]);
}

/** What a highlighted block may hold: Shiki's tags, and in `style` only its colour custom properties. */
function findUnexpectedMarkupInHighlightedBlocks(html: string): string[] {
    const issues: string[] = [];
    for (const highlighted of html.match(/<pre class="shiki[\s\S]*?<\/pre>/g) ?? []) {
        for (const {tag, name, attributes} of parseTags(highlighted)) {
            if (!['pre', 'code', 'span'].includes(name)) issues.push(`tag ${tag}`);
            for (const [attribute, value] of Object.entries(attributes)) {
                if (!['class', 'style', 'tabindex'].includes(attribute)) issues.push(`attribute ${attribute} in ${tag}`);
                const declarations = attribute === 'style' ? value.split(';').filter(Boolean) : [];
                if (!declarations.every((declaration) => /^--shiki-[a-z-]+:[#0-9a-z]+$/i.test(declaration))) issues.push(`style in ${tag}`);
            }
        }
    }
    return issues;
}

const block = (lang: string, code: string) => `<pre><code class="language-${lang}">${code}</code></pre>`;

describe('SyntaxHighlightPlugin', () => {
    before(async function () {
        this.timeout(20000);
        expect(await loadSyntaxHighlighter()).to.equal(true);
    });

    describe('postProcess (unit)', () => {
        const plugin = new SyntaxHighlightPlugin();

        it('returns input unchanged when no fenced blocks present', () => {
            const html = '<p>hello</p>';
            expect(plugin.postProcess(html)).to.equal(html);
        });

        it('returns input unchanged when block has no language class', () => {
            const html = '<pre><code>plain text\n</code></pre>';
            expect(plugin.postProcess(html)).to.equal(html);
        });

        it('returns input unchanged for unsupported languages', () => {
            const html = block('cobol', 'DISPLAY "HI"\n');
            expect(plugin.postProcess(html)).to.equal(html);
        });

        it('does not treat Object.prototype names as languages', () => {
            for (const lang of ['constructor', 'tostring', '__proto__', 'hasownproperty']) {
                const html = block(lang, 'x\n');
                expect(plugin.postProcess(html), `lang=${lang}`).to.equal(html);
            }
        });

        it('highlights blocks tagged with a known language', () => {
            const out = plugin.postProcess(block('js', 'const x = 1;\n'));
            expect(out).to.include('class="shiki');
            expect(out).to.include('--shiki-light');
            expect(out).to.include('--shiki-dark');
        });

        it('highlights every whitelisted language and alias', function () {
            // compiles every grammar once
            this.timeout(20000);
            for (const lang of Object.keys(HIGHLIGHT_LANGUAGES)) {
                const out = plugin.postProcess(block(lang, 'x = 1\n'));
                expect(out, `lang=${lang}`).to.include('class="shiki');
            }
        });

        it('decodes HTML entities in code text before highlighting', () => {
            // The source held `<`, `>` and `&`, which the sanitizer escaped: Shiki must see the
            // decoded characters and escape them once in its output.
            const out = plugin.postProcess(block('cpp', 'int x = 1 &lt; 2 &amp;&amp; 3 &gt; 0;\n'));
            expect(out).to.include('&lt;');
            expect(out).to.include('&gt;');
            expect(out).to.include('&amp;');
            expect(out).to.not.include('&amp;lt;');
            expect(out).to.not.include('&amp;gt;');
        });

        it('escapes script tags appearing as code content', () => {
            // Shiki may split the text into several spans, so "&lt;script&gt;" need not appear
            // contiguously: the invariant is that no executable <script> reaches the output.
            const out = plugin.postProcess(block('js', '&lt;script&gt;alert(1)&lt;/script&gt;\n'));
            expect(out).to.include('class="shiki');
            expect(out).to.not.match(/<script[^>]*>/i);
            expect(out).to.not.match(/<\/script>/i);
            expect(out).to.include('&lt;');
            expect(out).to.include('&gt;');
        });

        it('leaves a block over 16 KiB of UTF-8 plain', () => {
            const html = block('js', 'x'.repeat(16 * 1024 + 1));
            expect(plugin.postProcess(html)).to.equal(html);
        });

        it('counts the size limit in UTF-8 bytes, not characters', () => {
            // 6000 three-byte characters: 6000 UTF-16 code units, 18000 UTF-8 bytes.
            const html = block('js', '€'.repeat(6000));
            expect(plugin.postProcess(html)).to.equal(html);
            expect(plugin.postProcess(block('js', '€'.repeat(5000)))).to.include('class="shiki');
        });

        it('leaves a block holding an element plain', () => {
            const html = block('js', 'a <a href="https://example.com">link</a> b');
            expect(plugin.postProcess(html)).to.equal(html);
        });

        it('handles multiple blocks in one document independently', () => {
            const blocks = [block('js', 'a;\n'), '<pre><code>plain\n</code></pre>', block('cpp', 'int x;\n')].join('');
            const out = plugin.postProcess(blocks);
            expect((out.match(/class="shiki/g) || []).length).to.equal(2);
            expect(out).to.include('<pre><code>plain\n</code></pre>');
        });

        it('produces output that passes the second-pass sanitize without losing colour info', () => {
            const out = plugin.postProcess(block('js', 'const x = 1;\n'));
            expect(out).to.match(/--shiki-light:#[0-9a-fA-F]{3,8}/);
            expect(out).to.match(/--shiki-dark:#[0-9a-fA-F]{3,8}/);
            expect(out).to.not.match(/on\w+=/);
            expect(out).to.not.include('<script');
        });

        it('renders the same block identically every time', () => {
            const html = block('python', 'def f():\n    return 1\n');
            expect(new SyntaxHighlightPlugin().postProcess(html)).to.equal(plugin.postProcess(html));
        });
    });

    describe('with an injected highlighter', () => {
        const countingHighlighter = (codeToHtml: CodeHighlighter['codeToHtml']) => {
            const calls: string[] = [];
            const highlighter: CodeHighlighter = {
                codeToHtml: (code, lang) => {
                    calls.push(`${lang}:${code}`);
                    return codeToHtml(code, lang);
                }
            };
            return {calls, highlighter};
        };

        it('returns its input while no highlighter is loaded', () => {
            const html = block('js', 'a;\n');
            expect(new SyntaxHighlightPlugin(() => undefined).postProcess(html)).to.equal(html);
        });

        it('serves a repeated block from the cache', () => {
            const shiki = getSyntaxHighlighter();
            const {calls, highlighter} = countingHighlighter((code, lang) => shiki.codeToHtml(code, lang));
            const plugin = new SyntaxHighlightPlugin(() => highlighter);
            const html = block('js', 'a;\n') + block('python', 'a\n');
            const first = plugin.postProcess(html);
            expect(plugin.postProcess(html)).to.equal(first);
            expect(plugin.postProcess(block('js', 'a;\n'))).to.include('class="shiki');
            expect(calls).to.deep.equal(['javascript:a;\n', 'python:a\n']);
        });

        it('keys the cache by language as well as source', () => {
            const {calls, highlighter} = countingHighlighter((_code, lang) => `<pre class="shiki"><code>${lang}</code></pre>`);
            const plugin = new SyntaxHighlightPlugin(() => highlighter);
            plugin.postProcess(block('js', 'x\n'));
            plugin.postProcess(block('ts', 'x\n'));
            plugin.postProcess(block('javascript', 'x\n'));
            expect(calls).to.deep.equal(['javascript:x\n', 'typescript:x\n']);
        });

        it('falls back to the plain block, once, when highlighting throws', () => {
            const {calls, highlighter} = countingHighlighter(() => {
                throw new Error('grammar exploded');
            });
            const plugin = new SyntaxHighlightPlugin(() => highlighter);
            const html = `<p>before</p>${block('js', 'a;\n')}<p>after</p>`;
            expect(plugin.postProcess(html)).to.equal(html);
            expect(plugin.postProcess(html)).to.equal(html);
            expect(calls).to.have.length(1);
        });

        it('strips markup and styles the highlighter output was not expected to carry', () => {
            const hostile =
                '<pre class="shiki evil" style="--shiki-light:#fff;background:url(https://x.example/)" onclick="alert(1)">' +
                '<code><span class="line" style="--shiki-dark:red;--shiki-light:#000"><img src=x onerror=alert(1)>a</span>' +
                '<a href="javascript:alert(1)">b</a><script>alert(1)</script></code></pre>';
            const plugin = new SyntaxHighlightPlugin(() => ({codeToHtml: () => hostile}));
            const out = plugin.postProcess(block('js', 'a\n'));
            expect(out).to.equal('<pre class="shiki" style="--shiki-light:#fff"><code><span class="line" style="--shiki-light:#000">a</span>b</code></pre>');
        });
    });

    describe('containsHighlightableCode', () => {
        it('finds a block in a supported language', () => {
            expect(containsHighlightableCode(`<p>x</p>${block('cpp', 'int a;')}`)).to.equal(true);
        });

        it('ignores untagged, unsupported, oversized and element-holding blocks', () => {
            expect(containsHighlightableCode('<p>x</p><code>inline</code>')).to.equal(false);
            expect(containsHighlightableCode('<pre><code>plain</code></pre>')).to.equal(false);
            expect(containsHighlightableCode(block('cobol', 'x'))).to.equal(false);
            expect(containsHighlightableCode(block('js', 'x'.repeat(16 * 1024 + 1)))).to.equal(false);
            expect(containsHighlightableCode(block('js', '<b>x</b>'))).to.equal(false);
        });
    });

    describe('full pipeline integration', () => {
        const baseOptions: RendererOptions = {
            baseUrl: 'https://hive.blog/',
            breaks: true,
            skipSanitization: false,
            allowInsecureScriptTags: false,
            addTargetBlankToLinks: true,
            addNofollowToLinks: true,
            cssClassForInternalLinks: 'hive-test',
            cssClassForExternalLinks: 'hive-test external',
            doNotShowImages: false,
            assetsWidth: 640,
            assetsHeight: 480,
            imageProxyFn: (url: string) => url,
            usertagUrlFn: (account: string) => `https://hive.blog/@${account}`,
            hashtagUrlFn: (hashtag: string) => `/trending/${hashtag}`,
            isLinkSafeFn: () => true,
            addExternalCssClassToMatchingLinksFn: () => false,
            plugins: [new SyntaxHighlightPlugin()]
        };
        const renderer = new DefaultRenderer(baseOptions);

        it('renders a fenced cpp block as highlighted', () => {
            const out = renderer.render('```cpp\nint main(){}\n```');
            expect(out).to.include('class="shiki');
            expect(out).to.include('github-light');
            expect(out).to.include('github-dark');
        });

        it('leaves an untagged fenced block as plain', () => {
            const out = renderer.render('```\nascii art\n```');
            expect(out).to.not.include('class="shiki');
            expect(out).to.include('<pre><code>ascii art\n</code></pre>');
        });

        it('leaves inline code as plain', () => {
            const out = renderer.render('hello `inline` world');
            expect(out).to.not.include('class="shiki');
            expect(out).to.include('<code>inline</code>');
        });

        it('strips bogus class values via the main sanitizer', () => {
            const out = renderer.render('<pre><code class="language-../etc/passwd">x</code></pre>');
            expect(out).to.not.include('language-..');
            expect(out).to.include('<pre><code>x</code></pre>');
        });

        it('keeps only a single language class on code', () => {
            const out = renderer.render('<pre><code class="language-js other">x</code></pre>');
            expect(out).to.not.include('class="shiki');
            expect(out).to.include('<pre><code>x</code></pre>');
        });

        it('strips on* event handlers attached to code blocks', () => {
            const out = renderer.render('<pre><code class="language-js" onclick="alert(1)">x</code></pre>');
            expect(out).to.not.match(/onclick/i);
            expect(out).to.not.include('alert(1)');
        });

        it('does not allow style attribute on code via main sanitizer', () => {
            const out = renderer.render('<pre><code class="language-js" style="color:red">x</code></pre>');
            expect(out).to.not.match(/<code[^>]*style=/);
            expect(out).to.not.include('color:red');
        });

        it('keeps every XSS payload inert inside a highlighted fence or a raw language block', function () {
            this.timeout(60000);
            const payloads = loadXssPayloads();
            expect(payloads.length).to.be.greaterThan(100);
            for (const payload of payloads) {
                for (const input of ['```html\n' + payload + '\n```', `<pre><code class="language-js">${payload}</code></pre>`]) {
                    const out = renderer.render(input);
                    expect(findActiveMarkup(out), `payload: ${payload}`).to.deep.equal([]);
                    expect(findUnexpectedMarkupInHighlightedBlocks(out), `payload: ${payload}\noutput: ${out}`).to.deep.equal([]);
                }
            }
        });

        it('escapes markup written inside a highlighted fence', () => {
            const out = renderer.render('```html\n<img src=x onerror="alert(1)"><script>alert(1)</script>\n```');
            expect(out).to.include('class="shiki');
            expect(out).to.not.match(/<img/i);
            expect(out).to.not.match(/<script/i);
        });
    });
});
