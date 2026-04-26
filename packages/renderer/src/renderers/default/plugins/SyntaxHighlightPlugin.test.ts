import {expect} from 'chai';
import 'mocha';
import {DefaultRenderer, type RendererOptions} from '../DefaultRenderer';
import {SyntaxHighlightPlugin} from './SyntaxHighlightPlugin';

describe('SyntaxHighlightPlugin', () => {
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
            const html = '<pre><code class="language-cobol">DISPLAY "HI"\n</code></pre>';
            expect(plugin.postProcess(html)).to.equal(html);
        });

        it('highlights blocks tagged with a known language', () => {
            const html = '<pre><code class="language-js">const x = 1;\n</code></pre>';
            const out = plugin.postProcess(html);
            expect(out).to.include('class="shiki');
            expect(out).to.include('--shiki-light');
            expect(out).to.include('--shiki-dark');
            expect(out).to.not.equal(html);
        });

        it('resolves common aliases (cpp/c++/python/sh)', () => {
            for (const lang of ['cpp', 'c++', 'python', 'py', 'sh', 'bash', 'rb', 'rust', 'rs', 'yml']) {
                const html = `<pre><code class="language-${lang}">x\n</code></pre>`;
                const out = plugin.postProcess(html);
                expect(out, `lang=${lang}`).to.include('class="shiki');
            }
        });

        it('decodes HTML entities in code text before highlighting', () => {
            // The literal source contained `<` and `>`, sanitize-html escaped them; Shiki must
            // see the decoded characters and re-escape them in its output.
            const html = '<pre><code class="language-cpp">int x = 1 &lt; 2 &amp;&amp; 3 &gt; 0;\n</code></pre>';
            const out = plugin.postProcess(html);
            expect(out).to.include('&lt;');
            expect(out).to.include('&gt;');
            expect(out).to.include('&amp;');
            // No double-encoded entities like &amp;lt;
            expect(out).to.not.include('&amp;lt;');
            expect(out).to.not.include('&amp;gt;');
        });

        it('escapes script tags appearing as code content', () => {
            // Even though `<script>` would not survive the main sanitizer, defense-in-depth:
            // if attacker text reaches Shiki, the highlighter must escape it.
            const html = '<pre><code class="language-js">&lt;script&gt;alert(1)&lt;/script&gt;\n</code></pre>';
            const out = plugin.postProcess(html);
            expect(out).to.not.include('<script>');
            expect(out).to.include('&lt;script&gt;');
        });

        it('falls through to original when block exceeds size cap', () => {
            const big = 'x'.repeat(60_000);
            const html = `<pre><code class="language-js">${big}</code></pre>`;
            expect(plugin.postProcess(html)).to.equal(html);
        });

        it('handles multiple blocks in one document independently', () => {
            const html =
                '<pre><code class="language-js">a;\n</code></pre>' +
                '<pre><code>plain\n</code></pre>' +
                '<pre><code class="language-cpp">int x;\n</code></pre>';
            const out = plugin.postProcess(html);
            expect((out.match(/class="shiki/g) || []).length).to.equal(2);
            expect(out).to.include('<pre><code>plain\n</code></pre>');
        });

        it('produces output that passes the second-pass sanitize without losing colour info', () => {
            // Sanity check: the rendered output should still carry the CSS variables
            // after the internal narrow sanitize.
            const html = '<pre><code class="language-js">const x = 1;\n</code></pre>';
            const out = plugin.postProcess(html);
            // Both light and dark colour vars survive
            expect(out).to.match(/--shiki-light:#[0-9a-fA-F]{3,8}/);
            expect(out).to.match(/--shiki-dark:#[0-9a-fA-F]{3,8}/);
            // No event handlers, no script
            expect(out).to.not.match(/on\w+=/);
            expect(out).to.not.include('<script');
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

        it('renders a fenced cpp block as highlighted', () => {
            const r = new DefaultRenderer(baseOptions);
            const out = r.render('```cpp\nint main(){}\n```');
            expect(out).to.include('class="shiki');
            expect(out).to.include('github-light');
            expect(out).to.include('github-dark');
        });

        it('leaves an untagged fenced block as plain', () => {
            const r = new DefaultRenderer(baseOptions);
            const out = r.render('```\nascii art\n```');
            expect(out).to.not.include('class="shiki');
            expect(out).to.include('<pre><code>ascii art\n</code></pre>');
        });

        it('leaves inline code as plain', () => {
            const r = new DefaultRenderer(baseOptions);
            const out = r.render('hello `inline` world');
            expect(out).to.not.include('class="shiki');
            expect(out).to.include('<code>inline</code>');
        });

        it('strips bogus class values via the main sanitizer', () => {
            const r = new DefaultRenderer(baseOptions);
            // Author-supplied raw HTML with a malicious class
            const out = r.render('<pre><code class="language-../etc/passwd">x</code></pre>');
            expect(out).to.not.include('language-../etc/passwd');
            expect(out).to.not.include('language-..');
        });

        it('strips on* event handlers attached to code blocks', () => {
            const r = new DefaultRenderer(baseOptions);
            const out = r.render('<pre><code class="language-js" onclick="alert(1)">x</code></pre>');
            expect(out).to.not.match(/onclick/i);
            expect(out).to.not.include('alert(1)');
        });

        it('does not allow style attribute on code via main sanitizer', () => {
            const r = new DefaultRenderer(baseOptions);
            const out = r.render('<pre><code class="language-js" style="color:red">x</code></pre>');
            // Only Shiki-emitted style attributes appear (on pre/span), never on code
            expect(out).to.not.match(/<code[^>]*style=/);
        });
    });
});
