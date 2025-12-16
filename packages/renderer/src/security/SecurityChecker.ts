import ChainedError from 'typescript-chained-error';
import {Log} from '../Log';

/**
 * Dangerous HTML patterns that can be used for XSS attacks.
 * These patterns detect various encoding tricks and obfuscation techniques.
 *
 * @security This is a critical security list. Add new patterns as new attack vectors are discovered.
 */
// eslint-disable-next-line no-control-regex
const DANGEROUS_PATTERNS: ReadonlyArray<{pattern: RegExp; name: string}> = [
    // Script tags (various encodings and obfuscations)
    {pattern: /<\s*script/gi, name: 'script tag'},
    {pattern: /<\s*\/\s*script/gi, name: 'closing script tag'},
    // Encoded script tags (HTML entities)
    {pattern: /&#x?0*3c;?\s*s\s*c\s*r\s*i\s*p\s*t/gi, name: 'encoded script tag'},
    {pattern: /&lt;\s*script/gi, name: 'HTML entity script tag'},
    // Script tag with null bytes or control characters (using unicode escapes)
    // eslint-disable-next-line no-control-regex
    {pattern: /<[\u0000-\u0020]*script/gi, name: 'script tag with control chars'},

    // Event handlers (onclick, onerror, onload, etc.)
    {pattern: /\bon\w+\s*=/gi, name: 'event handler attribute'},
    // Event handlers with encoded characters
    {pattern: /&#x?0*6f;?&#x?0*6e;?\w+\s*=/gi, name: 'encoded event handler'},

    // JavaScript protocol in URLs
    {pattern: /javascript\s*:/gi, name: 'javascript: protocol'},
    // Encoded javascript protocol
    {pattern: /&#x?0*6a;?&#x?0*61;?&#x?0*76;?&#x?0*61;?&#x?0*73;?&#x?0*63;?&#x?0*72;?&#x?0*69;?&#x?0*70;?&#x?0*74;?\s*:/gi, name: 'encoded javascript: protocol'},
    {pattern: /j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi, name: 'spaced javascript: protocol'},

    // VBScript protocol (IE specific but still dangerous)
    {pattern: /vbscript\s*:/gi, name: 'vbscript: protocol'},

    // Data URIs with script content
    {pattern: /data\s*:\s*text\/html/gi, name: 'data: text/html URI'},
    {pattern: /data\s*:\s*application\/x?html/gi, name: 'data: application/html URI'},
    {pattern: /data\s*:[^,]*base64[^,]*,.*<script/gi, name: 'data: base64 with script'},

    // SVG-based XSS
    {pattern: /<\s*svg[^>]*\s+on\w+\s*=/gi, name: 'SVG with event handler'},
    {pattern: /<\s*svg[^>]*>[\s\S]*<\s*script/gi, name: 'SVG with embedded script'},

    // Object/embed tags that can execute code
    {pattern: /<\s*object/gi, name: 'object tag'},
    {pattern: /<\s*embed/gi, name: 'embed tag'},
    {pattern: /<\s*applet/gi, name: 'applet tag'},

    // Form tags (can be used for phishing)
    {pattern: /<\s*form/gi, name: 'form tag'},
    {pattern: /<\s*input/gi, name: 'input tag'},
    {pattern: /<\s*button/gi, name: 'button tag'},

    // Base tag (can redirect all relative URLs)
    {pattern: /<\s*base/gi, name: 'base tag'},

    // Meta refresh (can redirect user)
    {pattern: /<\s*meta[^>]*http-equiv\s*=\s*["']?refresh/gi, name: 'meta refresh'},

    // Style tags (can be used for CSS injection/exfiltration)
    {pattern: /<\s*style/gi, name: 'style tag'},

    // Link tags (can load external stylesheets)
    {pattern: /<\s*link[^>]*rel\s*=\s*["']?stylesheet/gi, name: 'stylesheet link'},

    // Expression in CSS (IE specific, historical)
    {pattern: /expression\s*\(/gi, name: 'CSS expression'},
    {pattern: /behavior\s*:/gi, name: 'CSS behavior'},
    {pattern: /-moz-binding\s*:/gi, name: 'CSS moz-binding'},

    // Import statements that could load external content
    {pattern: /@import/gi, name: 'CSS @import'},

    // Template injection
    {pattern: /\{\{\s*constructor/gi, name: 'template constructor access'},
    {pattern: /\[\s*["']constructor["']\s*\]/gi, name: 'bracket constructor access'}
];

/**
 * SecurityChecker provides comprehensive methods to validate content against security rules.
 * This class helps prevent XSS attacks by checking for potentially dangerous HTML content
 * using multiple layers of detection including pattern matching, encoding detection, and
 * structural analysis.
 *
 * @security This is a critical security component. All patterns have been reviewed for
 * false positives and effectiveness against known attack vectors.
 */
export class SecurityChecker {
    /**
     * Checks if the provided text contains potentially unsafe content based on security rules.
     * Performs comprehensive checks for various XSS attack vectors including:
     * - Script tags (various encodings)
     * - Event handlers
     * - Dangerous protocols (javascript:, vbscript:, data:)
     * - Object/embed tags
     * - CSS injection vectors
     *
     * @param text - The text content to check
     * @param props - Security check configuration
     * @param props.allowScriptTag - When false, throws if dangerous content is found
     * @throws {SecurityError} When security rules are violated
     */
    public static checkSecurity(text: string, props: {allowScriptTag: boolean}): void {
        if (props.allowScriptTag) {
            Log.log().warn('SECURITY: allowScriptTag is enabled - content will not be checked for dangerous patterns');
            return;
        }

        // Normalize text for detection (decode common encodings)
        const normalizedText = this.normalizeForDetection(text);

        // Check all dangerous patterns
        const violations = this.findViolations(normalizedText);

        if (violations.length > 0) {
            const violationNames = violations.map((v) => v.name).join(', ');
            Log.log().warn('SECURITY: Blocked content with violations: %s', violationNames);
            throw new SecurityError(`Renderer rejected the input because of insecure content: ${violationNames}`);
        }
    }

    /**
     * Finds all security violations in the text.
     * @param text - The normalized text to check
     * @returns Array of violation objects with pattern and name
     */
    private static findViolations(text: string): Array<{pattern: RegExp; name: string}> {
        const violations: Array<{pattern: RegExp; name: string}> = [];

        for (const check of DANGEROUS_PATTERNS) {
            // Reset regex state (important for global patterns)
            check.pattern.lastIndex = 0;
            if (check.pattern.test(text)) {
                violations.push(check);
            }
        }

        return violations;
    }

    /**
     * Normalizes text for security detection by decoding common encoding tricks.
     * This helps catch obfuscated attack vectors.
     *
     * @param text - The raw text to normalize
     * @returns Normalized text with common encodings decoded
     */
    private static normalizeForDetection(text: string): string {
        let normalized = text;

        // Decode HTML entities (numeric and named)
        normalized = this.decodeHtmlEntities(normalized);

        // Remove null bytes and control characters that might be used for obfuscation
        // eslint-disable-next-line no-control-regex
        normalized = normalized.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

        // Normalize whitespace within tags (collapse multiple spaces)
        normalized = normalized.replace(/<([^>]*\s{2,}[^>]*)>/g, (match) => match.replace(/\s+/g, ' '));

        return normalized;
    }

    /**
     * Decodes HTML entities to their character equivalents.
     * @param text - Text with HTML entities
     * @returns Text with entities decoded
     */
    private static decodeHtmlEntities(text: string): string {
        // Decode numeric entities (&#60; or &#x3c;)
        text = text.replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        text = text.replace(/&#(\d+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

        // Decode common named entities
        const namedEntities: Record<string, string> = {
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&apos;': "'",
            '&nbsp;': ' '
        };

        for (const [entity, char] of Object.entries(namedEntities)) {
            text = text.replace(new RegExp(entity, 'gi'), char);
        }

        return text;
    }

    /**
     * Tests if the input text contains any script tags (legacy method for backwards compatibility).
     * @param text - The text to check for script tags
     * @returns true if script tags are found, false otherwise
     * @deprecated Use checkSecurity() instead for comprehensive XSS detection
     */
    public static containsScriptTag(text: string): boolean {
        return /<\s*script/gi.test(text);
    }

    /**
     * Quick check if text contains any potentially dangerous content.
     * Useful for pre-filtering before expensive sanitization.
     *
     * @param text - The text to check
     * @returns true if any dangerous pattern is found, false otherwise
     */
    public static containsDangerousContent(text: string): boolean {
        const normalized = this.normalizeForDetection(text);
        return this.findViolations(normalized).length > 0;
    }

    /**
     * Returns a list of all dangerous pattern names being checked.
     * Useful for documentation and debugging.
     *
     * @returns Array of pattern names
     */
    public static getCheckedPatterns(): string[] {
        return DANGEROUS_PATTERNS.map((p) => p.name);
    }
}

/**
 * Error thrown when security validation fails.
 */
export class SecurityError extends ChainedError {
    public constructor(message?: string, cause?: Error) {
        super(message, cause);
    }
}
