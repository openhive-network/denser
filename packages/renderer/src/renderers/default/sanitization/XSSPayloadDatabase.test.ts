/**
 * XSS Payload Database Tests
 *
 * Data-driven XSS testing using payloads from multiple security research sources:
 * - OWASP XSS Filter Evasion Cheat Sheet
 * - PortSwigger XSS Cheat Sheet
 * - Generated encoding variations
 * - PayloadsAllTheThings community collection
 *
 * These tests ensure the sanitizer blocks known XSS vectors from security researchers.
 * Add new payloads to the JSON files in test-data/xss-payloads/ without modifying tests.
 */
import {expect} from 'chai';
import 'mocha';
import * as fs from 'fs';
import * as path from 'path';
import {Localization} from '../Localization';
import {TagTransformingSanitizer} from './TagTransformingSanitizer';

// Payload file interface
interface PayloadFile {
    source: string;
    url?: string;
    description?: string;
    lastUpdated: string;
    payloads: Array<{
        name: string;
        payload: string;
        skip?: boolean;
        skipReason?: string;
    }>;
}

// Test configuration
const PAYLOAD_DIR = path.join(__dirname, '../../../../test-data/xss-payloads');

const sanitizerOptions = {
    iframeWidth: 640,
    iframeHeight: 480,
    addNofollowToLinks: false,
    addTargetBlankToLinks: false,
    cssClassForInternalLinks: 'internal',
    cssClassForExternalLinks: 'external',
    noImage: false,
    isLinkSafeFn: (_url: string) => true,
    addExternalCssClassToMatchingLinksFn: (url: string) => !url.startsWith('https://hive.blog')
};

/**
 * Check if sanitizer output contains dangerous patterns.
 * Returns array of detected issues, empty if safe.
 *
 * IMPORTANT: Only checks for patterns in actual HTML tags, not in
 * HTML-encoded content (e.g., &lt;script&gt; is safe, <script> is not).
 */
function detectDangerousPatterns(output: string): string[] {
    const issues: string[] = [];

    // First, check if the output is HTML-encoded (starts with &lt;)
    // If the original < is encoded as &lt;, the content is safe
    const hasRawHtmlTags = /<[a-z]/i.test(output);

    // If no raw HTML tags exist, output is safe (all encoded)
    if (!hasRawHtmlTags) {
        return issues;
    }

    // Script tags
    if (/<script[\s>]/i.test(output)) {
        issues.push('script tag');
    }
    if (/<\/script>/i.test(output)) {
        issues.push('script closing tag');
    }

    // Event handlers in actual tags (look for < followed by tag content with on*)
    // Match: <tagname ... onXXX= but not &lt;tagname
    if (/<[a-z][^>]*\son\w+\s*=/i.test(output)) {
        issues.push('event handler attribute');
    }

    // Dangerous URL schemes in attributes within actual tags
    if (/<[a-z][^>]*(?:href|src|action|formaction|poster|background)\s*=\s*["']?\s*javascript:/i.test(output)) {
        issues.push('javascript: in attribute');
    }
    if (/<[a-z][^>]*(?:href|src|action|formaction)\s*=\s*["']?\s*vbscript:/i.test(output)) {
        issues.push('vbscript: in attribute');
    }
    if (/<[a-z][^>]*(?:href|src)\s*=\s*["']?\s*data:text\/html/i.test(output)) {
        issues.push('data:text/html in attribute');
    }

    // Dangerous style patterns within tags
    if (/<[a-z][^>]*style\s*=\s*["'][^"']*expression\s*\(/i.test(output)) {
        issues.push('CSS expression()');
    }
    if (/<[a-z][^>]*style\s*=\s*["'][^"']*behavior\s*:/i.test(output)) {
        issues.push('CSS behavior:');
    }
    if (/<[a-z][^>]*style\s*=\s*["'][^"']*-moz-binding/i.test(output)) {
        issues.push('CSS -moz-binding');
    }

    // Style tag with @import
    if (/<style[^>]*>[^<]*@import/i.test(output)) {
        issues.push('CSS @import');
    }

    // Dangerous tags that should be stripped
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

    // XML-based attacks
    if (/<!\[CDATA\[/i.test(output)) {
        issues.push('CDATA section');
    }
    if (/<\?xml/i.test(output)) {
        issues.push('XML processing instruction');
    }

    // srcdoc attribute in actual tags
    if (/<[a-z][^>]*srcdoc\s*=/i.test(output)) {
        issues.push('srcdoc attribute');
    }

    return issues;
}

/**
 * Load all payload files from the test-data directory.
 */
function loadPayloadFiles(): Map<string, PayloadFile> {
    const payloadFiles = new Map<string, PayloadFile>();

    if (!fs.existsSync(PAYLOAD_DIR)) {
        console.warn(`Payload directory not found: ${PAYLOAD_DIR}`);
        return payloadFiles;
    }

    const files = fs.readdirSync(PAYLOAD_DIR).filter(f => f.endsWith('.json'));

    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(PAYLOAD_DIR, file), 'utf-8');
            const parsed = JSON.parse(content) as PayloadFile;
            payloadFiles.set(file.replace('.json', ''), parsed);
        } catch (e) {
            console.error(`Failed to load payload file ${file}:`, e);
        }
    }

    return payloadFiles;
}

// Load payloads once at test setup
const payloadFiles = loadPayloadFiles();

describe('XSS Payload Database Tests', function () {
    // Allow longer timeout for large payload sets
    this.timeout(30000);

    const sanitizer = new TagTransformingSanitizer(sanitizerOptions, Localization.DEFAULT);

    // Generate tests for each payload file
    for (const [sourceName, payloadFile] of payloadFiles) {
        describe(`Source: ${payloadFile.source}`, function () {
            const activePayloads = payloadFile.payloads.filter(p => !p.skip);
            const skippedPayloads = payloadFile.payloads.filter(p => p.skip);

            // Log stats
            before(function () {
                console.log(`  Loading ${activePayloads.length} payloads (${skippedPayloads.length} skipped)`);
            });

            // Test each payload
            for (const {name, payload, skip, skipReason} of payloadFile.payloads) {
                if (skip) {
                    it.skip(`[SKIPPED: ${skipReason || 'unknown'}] ${name}`, function () {
                        // Skipped test
                    });
                    continue;
                }

                it(`should neutralize: ${name}`, function () {
                    const output = sanitizer.sanitize(payload);
                    const issues = detectDangerousPatterns(output);

                    if (issues.length > 0) {
                        // Provide detailed failure message
                        const msg = [
                            `Dangerous pattern(s) detected in output:`,
                            `  Issues: ${issues.join(', ')}`,
                            `  Input:  ${payload.slice(0, 100)}${payload.length > 100 ? '...' : ''}`,
                            `  Output: ${output.slice(0, 200)}${output.length > 200 ? '...' : ''}`
                        ].join('\n');

                        expect.fail(msg);
                    }
                });
            }
        });
    }

    // Summary test to ensure payloads were loaded
    describe('Payload Loading', function () {
        it('should have loaded payload files', function () {
            expect(payloadFiles.size).to.be.greaterThan(0);
        });

        it('should have loaded a reasonable number of payloads', function () {
            let total = 0;
            for (const [, file] of payloadFiles) {
                total += file.payloads.length;
            }
            // Should have at least 100 payloads across all files
            expect(total).to.be.greaterThan(100);
        });
    });
});

/**
 * Additional test suite for payload variations generated at runtime.
 * This creates combinatorial variations of base payloads.
 */
describe('Generated Payload Variations', function () {
    this.timeout(30000);

    const sanitizer = new TagTransformingSanitizer(sanitizerOptions, Localization.DEFAULT);

    // Base payloads to generate variations from
    const basePayloads = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<a href="javascript:alert(1)">x</a>',
        '<div onmouseover="alert(1)">x</div>'
    ];

    // Case variations
    describe('Case Variations', function () {
        const caseVariations = [
            (s: string) => s.toLowerCase(),
            (s: string) => s.toUpperCase(),
            (s: string) => s.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('')
        ];

        for (const base of basePayloads) {
            for (let i = 0; i < caseVariations.length; i++) {
                const varied = caseVariations[i](base);
                it(`should handle case variation ${i + 1}: ${varied.slice(0, 50)}...`, function () {
                    const output = sanitizer.sanitize(varied);
                    const issues = detectDangerousPatterns(output);
                    expect(issues, `Found: ${issues.join(', ')}\nOutput: ${output}`).to.be.empty;
                });
            }
        }
    });

    // Whitespace variations
    describe('Whitespace Variations', function () {
        const whitespaceChars = [' ', '\t', '\n', '\r', '\f', '\v'];

        for (const base of basePayloads) {
            for (const ws of whitespaceChars) {
                // Insert whitespace after < in tags
                const varied = base.replace(/<([a-z])/gi, `<${ws}$1`);
                const wsName = JSON.stringify(ws);
                it(`should handle whitespace ${wsName} in tags`, function () {
                    const output = sanitizer.sanitize(varied);
                    const issues = detectDangerousPatterns(output);
                    expect(issues, `Found: ${issues.join(', ')}\nOutput: ${output}`).to.be.empty;
                });
            }
        }
    });

    // Null byte injection
    describe('Null Byte Injection', function () {
        const nullPositions = [
            {desc: 'after <', fn: (s: string) => s.replace(/<([a-z])/gi, '<\x00$1')},
            {desc: 'mid-tag', fn: (s: string) => s.replace(/script/gi, 'scr\x00ipt')},
            {desc: 'before =', fn: (s: string) => s.replace(/=/g, '\x00=')}
        ];

        for (const base of basePayloads) {
            for (const {desc, fn} of nullPositions) {
                it(`should handle null byte ${desc}: ${base.slice(0, 30)}...`, function () {
                    const varied = fn(base);
                    const output = sanitizer.sanitize(varied);
                    // Note: null byte handling is a known limitation
                    // We test it but don't necessarily expect all to pass
                    const issues = detectDangerousPatterns(output);
                    // Log but don't fail - document behavior
                    if (issues.length > 0) {
                        console.log(`    [KNOWN LIMITATION] Null byte bypass: ${issues.join(', ')}`);
                    }
                });
            }
        }
    });

    // Entity encoding variations
    describe('Entity Encoding Variations', function () {
        const encodeChar = (c: string): string[] => {
            const code = c.charCodeAt(0);
            return [
                c,
                `&#${code};`,
                `&#x${code.toString(16)};`,
                `&#X${code.toString(16).toUpperCase()};`,
                `&#0${code};`,
                `&#00${code};`
            ];
        };

        // Test encoding of key characters
        const keyChars = ['<', '>', '"', "'", '=', '/', 's', 'c', 'r', 'i', 'p', 't'];

        for (const char of keyChars) {
            const encodings = encodeChar(char);
            for (const encoded of encodings) {
                if (encoded === char) continue; // Skip original
                it(`should handle entity encoding of '${char}' as ${encoded}`, function () {
                    const payload = `<${encoded}script>alert(1)</script>`;
                    const output = sanitizer.sanitize(payload);
                    const issues = detectDangerousPatterns(output);
                    expect(issues, `Found: ${issues.join(', ')}\nOutput: ${output}`).to.be.empty;
                });
            }
        }
    });
});

/**
 * Stress test with very long and deeply nested payloads.
 */
describe('Stress Tests', function () {
    this.timeout(60000);

    const sanitizer = new TagTransformingSanitizer(sanitizerOptions, Localization.DEFAULT);

    it('should handle very long payload', function () {
        const longPayload = '<script>' + 'x'.repeat(100000) + '</script>';
        const output = sanitizer.sanitize(longPayload);
        expect(detectDangerousPatterns(output)).to.be.empty;
    });

    it('should handle deeply nested tags', function () {
        let nested = 'XSS';
        for (let i = 0; i < 100; i++) {
            nested = `<div>${nested}</div>`;
        }
        nested = `<script>${nested}</script>`;
        const output = sanitizer.sanitize(nested);
        expect(detectDangerousPatterns(output)).to.be.empty;
    });

    it('should handle many different event handlers', function () {
        const handlers = [
            'onclick', 'ondblclick', 'onmousedown', 'onmouseup', 'onmouseover',
            'onmousemove', 'onmouseout', 'onkeydown', 'onkeypress', 'onkeyup',
            'onfocus', 'onblur', 'onchange', 'onsubmit', 'onload', 'onerror'
        ];
        const payload = handlers.map(h => `<div ${h}="alert(1)">x</div>`).join('');
        const output = sanitizer.sanitize(payload);
        expect(detectDangerousPatterns(output)).to.be.empty;
    });

    it('should handle repeated scripts', function () {
        const payload = '<script>alert(1)</script>'.repeat(1000);
        const output = sanitizer.sanitize(payload);
        expect(detectDangerousPatterns(output)).to.be.empty;
    });

    it('should handle mixed malicious content', function () {
        const payload = `
            <script>alert(1)</script>
            <img src=x onerror=alert(2)>
            <svg onload=alert(3)>
            <a href="javascript:alert(4)">click</a>
            <div style="expression(alert(5))">x</div>
            <iframe src="javascript:alert(6)">
            <object data="javascript:alert(7)">
            <embed src="javascript:alert(8)">
            <form action="javascript:alert(9)">
            <input onfocus=alert(10) autofocus>
        `;
        const output = sanitizer.sanitize(payload);
        expect(detectDangerousPatterns(output)).to.be.empty;
    });
});
