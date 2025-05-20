/** Configuration options for the spoiler plugin */
interface SpoilerConfig {
    /** The prefix character used to identify spoiler blocks. Defaults to '!' */
    prefix?: string;
    /** Default text shown on the spoiler reveal button. Defaults to 'Reveal spoiler' */
    defaultRevealText?: string;
    /** Maximum length of custom reveal text. Defaults to 50 */
    revealTextMaxLength?: number;
}

/** Metadata for a spoiler block */
interface SpoilerMetadata {
    /** Text to show on the reveal button */
    revealText: string;
}

/** Token structure used by Remarkable parser */
interface RemarkableToken {
    /** Type of the token */
    type: string;
    /** Content of the token */
    content: string;
    /** Nesting level */
    level?: number;
    /** Line numbers [start, end] */
    lines?: [number, number];
    /** Child tokens */
    children?: RemarkableToken[];
}

/** Remarkable parser options */
interface RemarkableOptions {
    compress?: boolean;
    xhtmlOut?: boolean;
    breaks?: boolean;
    langPrefix?: string;
    linkTarget?: string;
}

/** Remarkable environment object */
interface RemarkableEnvironment {
    [key: string]: any;
}

/** Remarkable renderer interface */
interface RemarkableRenderer {
    rules: {
        [key: string]: (tokens: RemarkableToken[], idx: number, options: RemarkableOptions, env: RemarkableEnvironment) => string;
    };
}

/** Remarkable parser instance interface */
interface RemarkableInstance {
    renderer: RemarkableRenderer;
}

/**
 * Remarkable plugin that adds support for spoiler blocks.
 * Usage:
 * > ! This is a spoiler with default reveal text
 * > ![Custom Text] This is a spoiler with custom reveal text
 *
 * @param md - Remarkable parser instance
 * @param config - Configuration options for the spoiler plugin
 */
const remarkableSpoiler = (md: RemarkableInstance, config: SpoilerConfig = {}) => {
    const {prefix = '!', defaultRevealText = 'Reveal spoiler', revealTextMaxLength = 50} = config;
    const originalOpenRenderer = md.renderer.rules.blockquote_open;
    const originalCloseRenderer = md.renderer.rules.blockquote_close;
    const originalInline = md.renderer.rules.text;
    let spoilerMetadata: SpoilerMetadata | undefined;

    const extractSpoilerMetadata = (tokens: RemarkableToken[], idx: number): SpoilerMetadata | null => {
        for (let ti = idx; ti < tokens.length; ti += 1) {
            const token = tokens[ti];

            if (token.type === 'blockquote_close') {
                return null;
            }

            if (token.type === 'inline' && token.content.indexOf(prefix) === 0) {
                const regex = new RegExp(`${prefix} {0,1}\\[([A-Za-z0-9 ?!]{1,${revealTextMaxLength}}?)\\] {0,1}`);
                const match = token.content.match(regex);

                if (match) {
                    return {revealText: match[1]};
                }

                return {revealText: defaultRevealText};
            }
        }

        return null;
    };

    md.renderer.rules.blockquote_open = (tokens: RemarkableToken[], idx: number, options: RemarkableOptions, env: RemarkableEnvironment): string => {
        if (!spoilerMetadata) {
            spoilerMetadata = extractSpoilerMetadata(tokens, idx) ?? undefined;
            if (spoilerMetadata) {
                return `<details><summary>${spoilerMetadata.revealText}</summary>`;
            }
        }

        return originalOpenRenderer(tokens, idx, options, env);
    };

    md.renderer.rules.blockquote_close = (tokens: RemarkableToken[], idx: number, options: RemarkableOptions, env: RemarkableEnvironment): string => {
        if (spoilerMetadata) {
            spoilerMetadata = undefined;
            return '</details>';
        }

        return originalCloseRenderer(tokens, idx, options, env);
    };

    md.renderer.rules.text = (tokens: RemarkableToken[], idx: number, options: RemarkableOptions, env: RemarkableEnvironment): string => {
        if (spoilerMetadata) {
            // Create regex pattern without template literal for security
            const prefixPattern = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const revealTextPattern = spoilerMetadata.revealText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const fullPattern = new RegExp(`^${prefixPattern} {0,1}\\[${revealTextPattern}\\] {0,1}`);
            const simplePattern = new RegExp(`^${prefixPattern}`);

            return tokens[idx].content.replace(fullPattern, '').replace(simplePattern, '');
        }
        return originalInline(tokens, idx, options, env);
    };
};

export default remarkableSpoiler;
