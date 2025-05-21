import ChainedError from 'typescript-chained-error';

/**
 * SecurityChecker provides methods to validate content against security rules.
 * This class helps prevent XSS attacks by checking for potentially dangerous HTML content.
 */
export class SecurityChecker {
    /**
     * Checks if the provided text contains potentially unsafe content based on security rules.
     * @param text - The text content to check
     * @param props - Security check configuration
     * @param props.allowScriptTag - When false, throws if script tags are found
     * @throws {SecurityError} When security rules are violated
     */
    public static checkSecurity(text: string, props: {allowScriptTag: boolean}) {
        if (!props.allowScriptTag && this.containsScriptTag(text)) {
            throw new SecurityError('Renderer rejected the input because of insecure content: text contains script tag');
        }
    }

    /**
     * Tests if the input text contains any script tags.
     * @param text - The text to check for script tags
     * @returns true if script tags are found, false otherwise
     * @private
     */
    private static containsScriptTag(text: string): boolean {
        return /<\s*script/gi.test(text);
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
