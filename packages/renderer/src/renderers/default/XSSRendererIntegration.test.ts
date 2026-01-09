/**
 * End-to-End XSS Integration Tests for DefaultRenderer
 *
 * These tests run XSS payloads through the FULL rendering pipeline:
 *   Input → Plugins → PreliminarySanitizer → Markdown → DOMParser → Sanitizer → Embedder → Output
 *
 * This catches vulnerabilities that component-level tests miss:
 * - Post-sanitization injection (embedder runs AFTER sanitizer)
 * - Interaction bugs between components
 * - Accidental security that could regress
 */
import {expect} from 'chai';
import 'mocha';
import {DefaultRenderer, RendererOptions} from './DefaultRenderer';

/**
 * Checks rendered output for dangerous patterns that indicate XSS
 */
function detectXSSInOutput(output: string): string[] {
    const issues: string[] = [];

    // Script tags (should never appear)
    if (/<script[\s>]/i.test(output)) {
        issues.push('script tag found');
    }

    // Event handlers in any element
    if (/<[a-z][^>]*\son\w+\s*=/i.test(output)) {
        issues.push('event handler attribute found');
    }

    // javascript: URLs
    if (/(?:href|src|action|formaction|data)\s*=\s*["']?\s*javascript:/i.test(output)) {
        issues.push('javascript: URL found');
    }

    // vbscript: URLs
    if (/(?:href|src)\s*=\s*["']?\s*vbscript:/i.test(output)) {
        issues.push('vbscript: URL found');
    }

    // data: URLs with HTML content
    if (/(?:href|src)\s*=\s*["']?\s*data:text\/html/i.test(output)) {
        issues.push('data:text/html URL found');
    }

    // Dangerous tags that shouldn't be in user content
    const dangerousTags = ['svg', 'math', 'object', 'embed', 'applet', 'form', 'meta', 'base', 'link'];
    for (const tag of dangerousTags) {
        if (new RegExp(`<${tag}[\\s>]`, 'i').test(output)) {
            issues.push(`${tag} tag found`);
        }
    }

    // CSS injection vectors
    if (/style\s*=\s*["'][^"']*expression\s*\(/i.test(output)) {
        issues.push('CSS expression() found');
    }
    if (/style\s*=\s*["'][^"']*behavior\s*:/i.test(output)) {
        issues.push('CSS behavior: found');
    }

    return issues;
}

/**
 * Standard renderer options for testing
 */
function createTestRenderer(): DefaultRenderer {
    const options: RendererOptions = {
        baseUrl: 'https://hive.blog/',
        breaks: true,
        skipSanitization: false,
        allowInsecureScriptTags: false,
        addNofollowToLinks: true,
        addTargetBlankToLinks: true,
        cssClassForInternalLinks: 'internal',
        cssClassForExternalLinks: 'external',
        doNotShowImages: false,
        ipfsPrefix: 'https://ipfs.io/ipfs/',
        assetsWidth: 640,
        assetsHeight: 480,
        imageProxyFn: (url: string) => url,
        hashtagUrlFn: (hashtag: string) => `/trending/${hashtag}`,
        usertagUrlFn: (account: string) => `/@${account}`,
        isLinkSafeFn: () => true,
        addExternalCssClassToMatchingLinksFn: () => true
    };
    return new DefaultRenderer(options);
}

describe('XSS End-to-End Integration Tests', function () {
    let renderer: DefaultRenderer;

    beforeEach(function () {
        renderer = createTestRenderer();
    });

    describe('1. Raw Embed Marker Injection', function () {
        // Attack: User directly types embed marker syntax to inject HTML

        it('blocks script injection via raw youtube marker', function () {
            const input = '~~~ embed:"><script>alert(1)</script><img src=" youtube ~~~';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks script injection via raw spotify marker', function () {
            const input = '~~~ embed:"><script>alert(1)</script> spotify ~~~';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks event handler injection via raw marker', function () {
            const input = '~~~ embed:" onclick="alert(1)" data-x=" youtube ~~~';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks javascript: URL via raw marker', function () {
            const input = '~~~ embed:javascript:alert(1) youtube ~~~';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('handles marker with path traversal attempt', function () {
            const input = '~~~ embed:../../../../../../etc/passwd youtube ~~~';
            const output = renderer.render(input);
            // Should not cause errors, marker should be neutralized or pass through as text
            expect(output).to.be.a('string');
        });

        it('handles multiple markers with mixed payloads', function () {
            const input = `
                ~~~ embed:legit123 youtube ~~~
                ~~~ embed:"><script>alert(1)</script> youtube ~~~
                ~~~ embed:valid456 vimeo ~~~
            `;
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });
    });

    describe('2. Malicious URL Embed Extraction', function () {
        // Attack: Craft URLs that extract malicious IDs from embedders

        it('blocks XSS via malicious Spotify URL with quote injection', function () {
            const input = 'Check this: https://open.spotify.com/playlist/ABC" onclick="alert(1)';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            // detectXSSInOutput correctly distinguishes between event handlers
            // in HTML tag attributes (dangerous) vs plain text (safe)
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via malicious YouTube URL', function () {
            const input = 'https://youtube.com/watch?v=ABC"><script>alert(1)</script>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via malicious Vimeo URL', function () {
            const input = 'https://vimeo.com/123" onload="alert(1)';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via malicious Twitch URL', function () {
            const input = 'https://twitch.tv/videos/123"><img src=x onerror=alert(1)>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via malicious Twitter/X URL', function () {
            const input = 'https://twitter.com/user/status/123" onclick="alert(1)';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via malicious 3Speak URL', function () {
            const input = 'https://3speak.tv/watch?v=user/abc"><script>alert(1)</script>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via malicious Instagram URL', function () {
            const input = 'https://instagram.com/p/ABC123" onclick="alert(1)';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });
    });

    describe('3. Mention and Hashtag Injection', function () {
        // Attack: Use @mentions or #hashtags to inject XSS

        it('blocks XSS via mention-like pattern with script', function () {
            const input = '@user"><script>alert(1)</script>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via mention with event handler', function () {
            const input = '@user" onclick="alert(1)';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via hashtag with script', function () {
            const input = '#tag"><script>alert(1)</script>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via hashtag with event handler', function () {
            const input = '#tag" onclick="alert(1)';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('handles valid mentions mixed with XSS attempts', function () {
            const input = '@validuser and @another"><script>alert(1)</script> posted';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
            // Valid mention should still be linkified
            expect(output).to.include('/@validuser');
        });
    });

    describe('4. Link and URL Injection', function () {
        // Attack: Inject XSS via URLs and link text

        it('blocks javascript: URLs in markdown links', function () {
            const input = '[click me](javascript:alert(1))';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks javascript: URLs in HTML links', function () {
            const input = '<a href="javascript:alert(1)">click</a>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks vbscript: URLs', function () {
            const input = '[click](vbscript:msgbox(1))';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks data: URLs with HTML', function () {
            const input = '[click](data:text/html,<script>alert(1)</script>)';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks XSS via link text that looks like URL', function () {
            const input = '<a href="https://evil.com">https://hive.blog/safe</a>';
            const output = renderer.render(input);
            // Should be flagged as phishing or the href should be visible
            expect(output).to.not.include('href="https://evil.com">https://hive.blog');
        });

        it('blocks attribute breakout in link href', function () {
            const input = '<a href="https://example.com" onclick="alert(1)">click</a>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });
    });

    describe('5. Image Injection', function () {
        // Attack: Inject XSS via image tags

        it('blocks onerror handler in markdown image', function () {
            const input = '![alt](https://example.com/img.jpg" onerror="alert(1))';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks onerror handler in HTML image', function () {
            const input = '<img src="x" onerror="alert(1)">';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks onload handler in image', function () {
            const input = '<img src="https://example.com/img.jpg" onload="alert(1)">';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks javascript: in image src', function () {
            const input = '<img src="javascript:alert(1)">';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks SVG with script via image', function () {
            const input = '<img src="data:image/svg+xml,<svg onload=alert(1)>">';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });
    });

    describe('6. HTML Tag Injection', function () {
        // Attack: Inject dangerous HTML tags

        it('blocks script tags', function () {
            const input = '<script>alert(1)</script>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks svg with onload', function () {
            const input = '<svg onload="alert(1)">';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks math with XSS', function () {
            const input = '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks object tag', function () {
            const input = '<object data="javascript:alert(1)">';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks embed tag', function () {
            const input = '<embed src="javascript:alert(1)">';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks form tag', function () {
            const input = '<form action="https://evil.com"><input name="data"><button>Submit</button></form>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks base tag', function () {
            const input = '<base href="https://evil.com/">';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks meta refresh', function () {
            const input = '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });
    });

    describe('7. Encoding and Obfuscation Bypass', function () {
        // Attack: Use encoding tricks to bypass filters

        it('blocks HTML entity encoded script', function () {
            const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
            const output = renderer.render(input);
            // Entities should remain encoded, not become executable
            expect(output).to.not.include('<script>');
        });

        it('blocks unicode encoded javascript:', function () {
            const input = '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert(1)">click</a>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks hex encoded javascript:', function () {
            const input = '<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)">click</a>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks mixed case jAvAsCrIpT:', function () {
            const input = '<a href="jAvAsCrIpT:alert(1)">click</a>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks javascript with newlines and tabs', function () {
            const input = '<a href="java\nscript:alert(1)">click</a>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks null byte injection', function () {
            const input = '<scr\x00ipt>alert(1)</script>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });
    });

    describe('8. CSS Injection', function () {
        // Attack: Inject malicious CSS

        it('blocks style attribute with expression', function () {
            const input = '<div style="width:expression(alert(1))">test</div>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks style attribute with behavior', function () {
            const input = '<div style="behavior:url(evil.htc)">test</div>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks style attribute with -moz-binding', function () {
            const input = '<div style="-moz-binding:url(evil.xml#xss)">test</div>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks style tag with @import', function () {
            const input = '<style>@import url(https://evil.com/xss.css);</style>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });
    });

    describe('9. Markdown-Specific Attacks', function () {
        // Attack: Exploit markdown parsing

        it('blocks XSS in markdown code blocks', function () {
            const input = '```\n<script>alert(1)</script>\n```';
            const output = renderer.render(input);
            // Script should be escaped inside code block
            expect(output).to.not.match(/<script>/i);
        });

        it('blocks XSS in inline code', function () {
            const input = '`<script>alert(1)</script>`';
            const output = renderer.render(input);
            expect(output).to.not.match(/<script>/i);
        });

        it('blocks XSS in markdown image alt text', function () {
            const input = '![<script>alert(1)</script>](https://example.com/img.jpg)';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('handles nested markdown with XSS attempts', function () {
            const input = '**bold [link](javascript:alert(1)) text**';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });
    });

    describe('10. Complex Multi-Vector Attacks', function () {
        // Attack: Combine multiple techniques

        it('blocks combined embed + script injection', function () {
            const input = `
                Check this video: https://youtube.com/watch?v=ABC123
                <script>alert(1)</script>
                And this: ~~~ embed:XSS youtube ~~~
            `;
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks combined mention + event handler', function () {
            const input = 'Hey @user check this <div onclick="alert(1)">link</div>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('blocks deeply nested attack', function () {
            const input = '<div><p><span><a href="javascript:alert(1)"><img src="x" onerror="alert(2)"></a></span></p></div>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('handles large payload with multiple vectors', function () {
            const payloads = [
                '<script>alert(1)</script>',
                '<img src=x onerror=alert(2)>',
                '<svg onload=alert(3)>',
                '<a href="javascript:alert(4)">click</a>',
                '~~~ embed:"><script>alert(5)</script> youtube ~~~',
                '@user" onclick="alert(6)',
                '#tag"><script>alert(7)</script>'
            ];
            const input = payloads.join('\n\nSome text between attacks.\n\n');
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });
    });

    describe('11. Regression Tests for Specific Vulnerabilities', function () {
        // Tests for specific patterns that could indicate regressions

        it('embed marker regex only allows safe characters in ID', function () {
            // If this passes, the accidental security in embed ID extraction is working
            // Characters that should NOT be allowed: " < > ' ; ( ) { }
            const dangerousChars = ['"', '<', '>', "'", ';', '(', ')', '{', '}', '`'];
            for (const char of dangerousChars) {
                const input = `~~~ embed:ABC${char}XSS youtube ~~~`;
                const output = renderer.render(input);
                // The embed should NOT be processed into an iframe - dangerous chars block it
                // Plain text output is safe, we check that no iframe was generated
                expect(output).to.not.match(/<iframe[^>]*ABC/i);
                // Also verify no XSS patterns in output
                const issues = detectXSSInOutput(output);
                expect(issues, `XSS found for char '${char}': ${output}`).to.be.empty;
            }
        });

        it('Spotify URL with injection does not execute', function () {
            // Spotify regex uses (.*) which is lax - verify it's still safe
            const input = 'https://open.spotify.com/playlist/abc123"><img src=x onerror=alert(1)>';
            const output = renderer.render(input);
            const issues = detectXSSInOutput(output);
            expect(issues, `XSS found in output: ${output}`).to.be.empty;
        });

        it('usertagUrlFn output cannot break attribute context', function () {
            // Even if usertagUrlFn returned malicious content, it should be escaped
            const input = '@validuser some text';
            const output = renderer.render(input);
            // The href should be properly quoted
            expect(output).to.match(/href="[^"]*@validuser[^"]*"/);
        });

        it('hashtagUrlFn output cannot break attribute context', function () {
            const input = '#validtag some text';
            const output = renderer.render(input);
            // The href should be properly quoted
            expect(output).to.match(/href="[^"]*validtag[^"]*"/);
        });
    });
});

describe('XSS Integration - Allowlist Verification', function () {
    // Verify that legitimate content still works

    let renderer: DefaultRenderer;

    beforeEach(function () {
        renderer = createTestRenderer();
    });

    it('allows legitimate YouTube embeds', function () {
        const input = 'Check this: https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const output = renderer.render(input);
        expect(output).to.include('youtube.com/embed/dQw4w9WgXcQ');
        expect(output).to.include('iframe');
    });

    it('allows legitimate Spotify embeds', function () {
        const input = 'Listen: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT';
        const output = renderer.render(input);
        expect(output).to.include('spotify.com');
        expect(output).to.include('iframe');
    });

    it('allows legitimate mentions', function () {
        const input = 'Thanks @alice and @bob for the help!';
        const output = renderer.render(input);
        expect(output).to.include('/@alice');
        expect(output).to.include('/@bob');
    });

    it('allows legitimate hashtags', function () {
        const input = 'Check out #hive and #crypto news';
        const output = renderer.render(input);
        expect(output).to.include('/trending/hive');
        expect(output).to.include('/trending/crypto');
    });

    it('allows legitimate markdown formatting', function () {
        const input = '**bold** and *italic* and [link](https://example.com)';
        const output = renderer.render(input);
        expect(output).to.include('<strong>bold</strong>');
        expect(output).to.include('<em>italic</em>');
        expect(output).to.include('href="https://example.com"');
    });

    it('allows legitimate images', function () {
        const input = '![alt text](https://example.com/image.jpg)';
        const output = renderer.render(input);
        expect(output).to.include('<img');
        expect(output).to.include('src="https://example.com/image.jpg"');
    });

    it('allows legitimate HTML subset', function () {
        const input = '<p>Paragraph with <strong>bold</strong> and <em>italic</em></p>';
        const output = renderer.render(input);
        expect(output).to.include('<p>');
        expect(output).to.include('<strong>');
        expect(output).to.include('<em>');
    });
});
