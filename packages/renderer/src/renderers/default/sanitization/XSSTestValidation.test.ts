/**
 * XSS Test Validation Suite
 *
 * This suite PROVES that our XSS tests actually work by:
 * 1. Testing the detection function directly with known-bad output
 * 2. Creating intentionally weak sanitizers and verifying tests catch them
 * 3. Demonstrating that loosening rules causes test failures
 *
 * If these meta-tests pass, we have confidence the main test suite is valid.
 */
import {expect} from 'chai';
import 'mocha';
import sanitizeHtml from 'sanitize-html';

/**
 * Detection function - copied from XSSPayloadDatabase.test.ts
 * We test this function directly to prove it works.
 */
function detectDangerousPatterns(output: string): string[] {
    const issues: string[] = [];
    const hasRawHtmlTags = /<[a-z]/i.test(output);
    if (!hasRawHtmlTags) {
        return issues;
    }

    if (/<script[\s>]/i.test(output)) {
        issues.push('script tag');
    }
    if (/<\/script>/i.test(output)) {
        issues.push('script closing tag');
    }
    if (/<[a-z][^>]*\son\w+\s*=/i.test(output)) {
        issues.push('event handler attribute');
    }
    if (/<[a-z][^>]*(?:href|src|action|formaction|poster|background)\s*=\s*["']?\s*javascript:/i.test(output)) {
        issues.push('javascript: in attribute');
    }
    if (/<[a-z][^>]*(?:href|src|action|formaction)\s*=\s*["']?\s*vbscript:/i.test(output)) {
        issues.push('vbscript: in attribute');
    }
    if (/<[a-z][^>]*(?:href|src)\s*=\s*["']?\s*data:text\/html/i.test(output)) {
        issues.push('data:text/html in attribute');
    }
    if (/<[a-z][^>]*style\s*=\s*["'][^"']*expression\s*\(/i.test(output)) {
        issues.push('CSS expression()');
    }
    if (/<[a-z][^>]*style\s*=\s*["'][^"']*behavior\s*:/i.test(output)) {
        issues.push('CSS behavior:');
    }
    if (/<[a-z][^>]*style\s*=\s*["'][^"']*-moz-binding/i.test(output)) {
        issues.push('CSS -moz-binding');
    }
    if (/<style[^>]*>[^<]*@import/i.test(output)) {
        issues.push('CSS @import');
    }

    const dangerousTags = [
        'svg', 'math', 'object', 'embed', 'applet', 'form', 'input', 'button',
        'select', 'textarea', 'style', 'link', 'meta', 'base', 'frame',
        'frameset', 'layer', 'bgsound', 'keygen', 'marquee', 'template', 'noscript'
    ];

    for (const tag of dangerousTags) {
        const pattern = new RegExp(`<${tag}[\\s>]`, 'i');
        if (pattern.test(output)) {
            issues.push(`${tag} tag`);
        }
    }

    if (/<!CDATA\[/i.test(output)) {
        issues.push('CDATA section');
    }
    if (/<\?xml/i.test(output)) {
        issues.push('XML processing instruction');
    }
    if (/<[a-z][^>]*srcdoc\s*=/i.test(output)) {
        issues.push('srcdoc attribute');
    }

    return issues;
}

describe('XSS Test Validation - Proving Tests Work', function () {

    describe('1. Detection Function Unit Tests', function () {
        describe('MUST detect script tags', function () {
            it('detects <script>', function () {
                const issues = detectDangerousPatterns('<script>alert(1)</script>');
                expect(issues).to.include('script tag');
            });

            it('detects <SCRIPT> (uppercase)', function () {
                const issues = detectDangerousPatterns('<SCRIPT>alert(1)</SCRIPT>');
                expect(issues).to.include('script tag');
            });

            it('detects </script> closing tag', function () {
                // Closing tag alone doesn't have <[a-z] pattern, need realistic context
                const issues = detectDangerousPatterns('<div>x</script>');
                expect(issues).to.include('script closing tag');
            });
        });

        describe('MUST detect event handlers', function () {
            it('detects onerror', function () {
                const issues = detectDangerousPatterns('<img src=x onerror=alert(1)>');
                expect(issues).to.include('event handler attribute');
            });

            it('detects onclick', function () {
                const issues = detectDangerousPatterns('<div onclick=alert(1)>');
                expect(issues).to.include('event handler attribute');
            });

            it('detects onload', function () {
                const issues = detectDangerousPatterns('<body onload=alert(1)>');
                expect(issues).to.include('event handler attribute');
            });

            it('detects onmouseover', function () {
                const issues = detectDangerousPatterns('<a onmouseover=alert(1)>');
                expect(issues).to.include('event handler attribute');
            });
        });

        describe('MUST detect dangerous URL schemes', function () {
            it('detects javascript: in href', function () {
                const issues = detectDangerousPatterns('<a href="javascript:alert(1)">');
                expect(issues).to.include('javascript: in attribute');
            });

            it('detects javascript: in src', function () {
                const issues = detectDangerousPatterns('<img src="javascript:alert(1)">');
                expect(issues).to.include('javascript: in attribute');
            });

            it('detects vbscript:', function () {
                const issues = detectDangerousPatterns('<a href="vbscript:msgbox(1)">');
                expect(issues).to.include('vbscript: in attribute');
            });

            it('detects data:text/html', function () {
                const issues = detectDangerousPatterns('<a href="data:text/html,<script>alert(1)</script>">');
                expect(issues).to.include('data:text/html in attribute');
            });
        });

        describe('MUST detect dangerous tags', function () {
            it('detects <svg>', function () {
                const issues = detectDangerousPatterns('<svg onload=alert(1)>');
                expect(issues).to.include('svg tag');
            });

            it('detects <math>', function () {
                const issues = detectDangerousPatterns('<math><mtext></mtext></math>');
                expect(issues).to.include('math tag');
            });

            it('detects <object>', function () {
                const issues = detectDangerousPatterns('<object data=x>');
                expect(issues).to.include('object tag');
            });

            it('detects <embed>', function () {
                const issues = detectDangerousPatterns('<embed src=x>');
                expect(issues).to.include('embed tag');
            });

            it('detects <form>', function () {
                const issues = detectDangerousPatterns('<form action=x>');
                expect(issues).to.include('form tag');
            });

            it('detects <style>', function () {
                const issues = detectDangerousPatterns('<style>body{}</style>');
                expect(issues).to.include('style tag');
            });
        });

        describe('MUST detect CSS attacks', function () {
            it('detects expression()', function () {
                const issues = detectDangerousPatterns('<div style="width:expression(alert(1))">');
                expect(issues).to.include('CSS expression()');
            });

            it('detects behavior:', function () {
                const issues = detectDangerousPatterns('<div style="behavior:url(x.htc)">');
                expect(issues).to.include('CSS behavior:');
            });

            it('detects -moz-binding', function () {
                const issues = detectDangerousPatterns('<div style="-moz-binding:url(x)">');
                expect(issues).to.include('CSS -moz-binding');
            });
        });

        describe('MUST NOT false-positive on safe content', function () {
            it('allows HTML-encoded content', function () {
                const issues = detectDangerousPatterns('&lt;script&gt;alert(1)&lt;/script&gt;');
                expect(issues).to.be.empty;
            });

            it('allows plain text', function () {
                const issues = detectDangerousPatterns('This is just text about javascript:');
                expect(issues).to.be.empty;
            });

            it('allows safe tags', function () {
                const issues = detectDangerousPatterns('<p>Hello <strong>world</strong></p>');
                expect(issues).to.be.empty;
            });

            it('allows safe links', function () {
                const issues = detectDangerousPatterns('<a href="https://example.com">link</a>');
                expect(issues).to.be.empty;
            });
        });
    });

    describe('2. Intentionally Weak Sanitizer Tests', function () {
        // These tests create BROKEN sanitizers and verify our detection catches them

        it('FAILS when sanitizer allows script tags', function () {
            const weakSanitizer = (html: string) => sanitizeHtml(html, {
                allowedTags: ['script', 'p', 'div'],  // DANGEROUS: allows script!
                allowedAttributes: {}
            });

            const output = weakSanitizer('<script>alert(1)</script>');
            const issues = detectDangerousPatterns(output);

            // This MUST detect the vulnerability
            expect(issues, 'Detection FAILED to catch allowed script tag').to.include('script tag');
        });

        it('FAILS when sanitizer allows event handlers', function () {
            const weakSanitizer = (html: string) => sanitizeHtml(html, {
                allowedTags: ['img', 'div'],
                allowedAttributes: {
                    'img': ['src', 'onerror'],  // DANGEROUS: allows onerror!
                    'div': ['onclick']           // DANGEROUS: allows onclick!
                }
            });

            const output = weakSanitizer('<img src=x onerror=alert(1)>');
            const issues = detectDangerousPatterns(output);

            expect(issues, 'Detection FAILED to catch onerror handler').to.include('event handler attribute');
        });

        it('FAILS when sanitizer allows javascript: URLs', function () {
            const weakSanitizer = (html: string) => sanitizeHtml(html, {
                allowedTags: ['a'],
                allowedAttributes: {
                    'a': ['href']
                },
                allowedSchemes: ['javascript']  // DANGEROUS: allows javascript:!
            });

            const output = weakSanitizer('<a href="javascript:alert(1)">click</a>');
            const issues = detectDangerousPatterns(output);

            expect(issues, 'Detection FAILED to catch javascript: URL').to.include('javascript: in attribute');
        });

        it('FAILS when sanitizer allows SVG', function () {
            const weakSanitizer = (html: string) => sanitizeHtml(html, {
                allowedTags: ['svg', 'p'],  // DANGEROUS: allows svg!
                allowedAttributes: {
                    'svg': ['onload']        // DANGEROUS: with event handler!
                }
            });

            const output = weakSanitizer('<svg onload=alert(1)>');
            const issues = detectDangerousPatterns(output);

            expect(issues, 'Detection FAILED to catch SVG tag').to.include('svg tag');
        });

        it('FAILS when sanitizer allows style tag', function () {
            const weakSanitizer = (html: string) => sanitizeHtml(html, {
                allowedTags: ['style', 'p'],  // DANGEROUS: allows style!
                allowedAttributes: {}
            });

            const output = weakSanitizer('<style>@import url(evil.css)</style>');
            const issues = detectDangerousPatterns(output);

            expect(issues, 'Detection FAILED to catch style tag').to.include('style tag');
        });

        it('FAILS when sanitizer allows form tag', function () {
            const weakSanitizer = (html: string) => sanitizeHtml(html, {
                allowedTags: ['form', 'input', 'button'],  // DANGEROUS!
                allowedAttributes: {
                    'form': ['action'],
                    'input': ['type', 'value'],
                    'button': ['type']
                }
            });

            const output = weakSanitizer('<form action="https://evil.com"><input type=text><button>Submit</button></form>');
            const issues = detectDangerousPatterns(output);

            expect(issues, 'Detection FAILED to catch form tag').to.include('form tag');
        });
    });

    describe('3. Regression Detection - Simulated Config Changes', function () {
        // Simulate what would happen if someone "accidentally" weakened the sanitizer

        const dangerousPayloads = [
            {name: 'script injection', payload: '<script>alert(1)</script>', detectsAs: 'script tag'},
            {name: 'img onerror', payload: '<img src=x onerror=alert(1)>', detectsAs: 'event handler attribute'},
            {name: 'svg onload', payload: '<svg onload=alert(1)>', detectsAs: 'svg tag'},
            {name: 'javascript href', payload: '<a href="javascript:alert(1)">x</a>', detectsAs: 'javascript: in attribute'},
            {name: 'style tag', payload: '<style>body{}</style>', detectsAs: 'style tag'},
            {name: 'form tag', payload: '<form><input></form>', detectsAs: 'form tag'},
        ];

        for (const {name, payload, detectsAs} of dangerousPayloads) {
            it(`catches "${name}" if it passes through sanitizer`, function () {
                // Simulate a broken sanitizer that lets this through
                const brokenOutput = payload;  // Pretend sanitizer didn't strip it

                const issues = detectDangerousPatterns(brokenOutput);
                expect(issues, `CRITICAL: Failed to detect ${name}`).to.include(detectsAs);
            });
        }
    });

    describe('4. Counter-Test: Verify Good Sanitizer Passes', function () {
        // Use the actual safe sanitize-html config and verify no issues

        const safeSanitizer = (html: string) => sanitizeHtml(html, {
            allowedTags: ['p', 'br', 'strong', 'em', 'a', 'img', 'div', 'span'],
            allowedAttributes: {
                'a': ['href', 'title'],
                'img': ['src', 'alt']
            },
            allowedSchemes: ['http', 'https'],
            disallowedTagsMode: 'discard'
        });

        const attacks = [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>',
            '<svg onload=alert(1)>',
            '<a href="javascript:alert(1)">x</a>',
            '<div onclick=alert(1)>x</div>',
            '<style>@import url(x)</style>',
            '<form action=x><input></form>',
        ];

        for (const attack of attacks) {
            it(`safe sanitizer neutralizes: ${attack.slice(0, 40)}...`, function () {
                const output = safeSanitizer(attack);
                const issues = detectDangerousPatterns(output);
                expect(issues, `Safe sanitizer let through: ${output}`).to.be.empty;
            });
        }
    });

    describe('5. Meta-Validation: Detection Function Completeness', function () {
        // Ensure detection function covers all critical patterns

        const criticalPatterns = [
            {pattern: 'script tag', example: '<script>'},
            {pattern: 'event handler attribute', example: '<div onclick=x>'},
            {pattern: 'javascript: in attribute', example: '<a href="javascript:x">'},
            {pattern: 'vbscript: in attribute', example: '<a href="vbscript:x">'},
            {pattern: 'data:text/html in attribute', example: '<a href="data:text/html,x">'},
            {pattern: 'svg tag', example: '<svg>'},
            {pattern: 'math tag', example: '<math>'},
            {pattern: 'object tag', example: '<object>'},
            {pattern: 'embed tag', example: '<embed>'},
            {pattern: 'form tag', example: '<form>'},
            {pattern: 'style tag', example: '<style>'},
            {pattern: 'CSS expression()', example: '<div style="width:expression(x)">'},
        ];

        for (const {pattern, example} of criticalPatterns) {
            it(`detection covers: ${pattern}`, function () {
                const issues = detectDangerousPatterns(example);
                expect(issues, `Detection function missing coverage for: ${pattern}`).to.include(pattern);
            });
        }
    });
});

describe('6. Live Demonstration: Loosening Rules Breaks Tests', function () {
    // This is the ultimate proof - we run real payloads through progressively
    // weaker sanitizers and show the tests catch each weakness

    const testPayload = '<script>alert(1)</script><img src=x onerror=alert(2)><svg onload=alert(3)>';

    it('SECURE config: all attacks blocked, zero issues', function () {
        const secureOutput = sanitizeHtml(testPayload, {
            allowedTags: ['p', 'br', 'img'],
            allowedAttributes: {'img': ['src', 'alt']},
            allowedSchemes: ['https']
        });

        const issues = detectDangerousPatterns(secureOutput);
        expect(issues).to.be.empty;
        console.log('    Secure output:', secureOutput);
    });

    it('WEAK config (allows script): test CATCHES it', function () {
        const weakOutput = sanitizeHtml(testPayload, {
            allowedTags: ['script', 'p', 'br', 'img'],  // Added script!
            allowedAttributes: {'img': ['src', 'alt']},
            allowedSchemes: ['https']
        });

        const issues = detectDangerousPatterns(weakOutput);
        expect(issues.length).to.be.greaterThan(0);
        expect(issues).to.include('script tag');
        console.log('    Weak output:', weakOutput);
        console.log('    Detected issues:', issues);
    });

    it('WEAK config (allows svg): test CATCHES it', function () {
        const weakOutput = sanitizeHtml(testPayload, {
            allowedTags: ['svg', 'p', 'br', 'img'],  // Added svg!
            allowedAttributes: {'img': ['src', 'alt'], 'svg': ['onload']},
            allowedSchemes: ['https']
        });

        const issues = detectDangerousPatterns(weakOutput);
        expect(issues.length).to.be.greaterThan(0);
        expect(issues).to.include('svg tag');
        console.log('    Weak output:', weakOutput);
        console.log('    Detected issues:', issues);
    });

    it('WEAK config (allows onerror): test CATCHES it', function () {
        const weakOutput = sanitizeHtml(testPayload, {
            allowedTags: ['p', 'br', 'img'],
            allowedAttributes: {'img': ['src', 'alt', 'onerror']},  // Added onerror!
            allowedSchemes: ['https']
        });

        const issues = detectDangerousPatterns(weakOutput);
        expect(issues.length).to.be.greaterThan(0);
        expect(issues).to.include('event handler attribute');
        console.log('    Weak output:', weakOutput);
        console.log('    Detected issues:', issues);
    });
});
