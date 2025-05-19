import ow from 'ow';
import {Remarkable} from 'remarkable';
import {SecurityChecker} from '../../security/SecurityChecker';
import {HtmlDOMParser} from './embedder/HtmlDOMParser';
import {Localization, LocalizationOptions} from './Localization';
import type {RendererPlugin} from './plugins/RendererPlugin';
import {PreliminarySanitizer} from './sanitization/PreliminarySanitizer';
import {TagTransformingSanitizer} from './sanitization/TagTransformingSanitizer';
import remarkableSpoiler from './plugins/SpoilerPlugin';
import '../../styles.css';

/**
 * DefaultRenderer is a configurable HTML/Markdown renderer that provides:
 * - Markdown to HTML conversion
 * - HTML sanitization and tag transformation
 * - Asset embedding and resizing
 * - Link handling and security checks
 * - Plugin system for pre/post processing
 */
export class DefaultRenderer {
    private options: RendererOptions;
    private tagTransformingSanitizer: TagTransformingSanitizer;
    private domParser: HtmlDOMParser;
    private plugins: RendererPlugin[] = [];

    /**
     * Creates a new DefaultRenderer instance
     * @param options - Configuration options for the renderer
     * @param localization - Optional localization settings. Uses default if not provided
     */
    public constructor(options: RendererOptions, localization: LocalizationOptions = Localization.DEFAULT) {
        this.validate(options);
        this.options = options;

        Localization.validate(localization);

        this.tagTransformingSanitizer = new TagTransformingSanitizer(
            {
                iframeWidth: this.options.assetsWidth,
                iframeHeight: this.options.assetsHeight,
                addNofollowToLinks: this.options.addNofollowToLinks,
                addTargetBlankToLinks: this.options.addTargetBlankToLinks,
                cssClassForInternalLinks: this.options.cssClassForInternalLinks,
                cssClassForExternalLinks: this.options.cssClassForExternalLinks,
                noImage: this.options.doNotShowImages,
                isLinkSafeFn: this.options.isLinkSafeFn,
                addExternalCssClassToMatchingLinksFn: this.options.addExternalCssClassToMatchingLinksFn
            },
            localization
        );

        this.domParser = new HtmlDOMParser(
            {
                width: this.options.assetsWidth,
                height: this.options.assetsHeight,
                ipfsPrefix: this.options.ipfsPrefix,
                baseUrl: this.options.baseUrl,
                imageProxyFn: this.options.imageProxyFn,
                hashtagUrlFn: this.options.hashtagUrlFn,
                usertagUrlFn: this.options.usertagUrlFn,
                hideImages: this.options.doNotShowImages
            },
            localization
        );

        this.plugins = options.plugins || [];
    }

    /**
     * Renders the input text to HTML
     * @param input - Markdown or HTML text to render
     * @returns Rendered and processed HTML
     * @throws Will throw if input is empty or invalid
     */
    public render(input: string): string {
        // Validate input
        ow(input, 'input', ow.string.nonEmpty);
        return this.doRender(input);
    }

    /**
     * Renders the input text to HTML with a specific locale
     * @param text - Markdown or HTML text to render
     * @returns Rendered and processed HTML
     * @throws Will throw if input is empty or invalid
     */
    private doRender(text: string): string {
        // Pre-process with plugins
        text = this.runPluginPhase('preProcess', text);
        // Preliminary sanitization
        text = PreliminarySanitizer.preliminarySanitize(text);
        // Check if the text is HTML or Markdown
        const isHtml = this.isHtml(text);
        // If it's HTML, skip rendering
        // If it's Markdown, we need to render it to HTML
        text = isHtml ? text : this.renderMarkdown(text);
        // Add HTML tags if needed
        text = this.wrapRenderedTextWithHtmlIfNeeded(text);
        // Parse the HTML and sanitize it
        text = this.domParser.parse(text).getParsedDocumentAsString();
        // Check for script tags and other security issues
        text = this.sanitize(text);
        // Check for security issues
        SecurityChecker.checkSecurity(text, {allowScriptTag: this.options.allowInsecureScriptTags});
        // Embed assets and resize them
        text = this.domParser.embedder.insertAssets(text);
        // Post-process with plugins
        text = this.runPluginPhase('postProcess', text);
        return text;
    }
    /**
     * Runs a specific phase of the plugin system
     * @param phase - Phase to run (preProcess or postProcess)
     * @param text - Text to process
     * @returns Processed text
     */
    private runPluginPhase(phase: 'preProcess' | 'postProcess', text: string): string {
        return this.plugins.reduce((processedText, plugin) => {
            const processor = plugin[phase];
            return processor ? processor(processedText) : processedText;
        }, text);
    }

    /**
     * Converts Markdown text to HTML using Remarkable
     * @param text - Markdown text to convert
     * @returns HTML string converted from Markdown
     * @remarks
     * Uses the Remarkable library with the following settings:
     * - HTML is enabled
     * - Line breaks are controlled by options.breaks
     * - Typographer is disabled to prevent URLs from breaking when they contain double-dashes.
     *   https://github.com/jonschlinkert/remarkable/issues/142#issuecomment-221546793
     * - Smart quotes are set to ""''
     */
    private renderMarkdown(text: string): string {
        const renderer = new Remarkable({
            html: true,
            breaks: this.options.breaks,
            typographer: false,
            quotes: '“”‘’'
        });
        renderer.use(remarkableSpoiler as any);

        return renderer.render(text);
    }

    /**
     * Wraps the rendered text with HTML tags if they are not already present
     * @param renderedText - The text that has been rendered from Markdown or processed HTML
     * @returns The text wrapped in <html> tags if needed, or the original text if already wrapped
     * @remarks
     * This is needed to ensure consistent DOM parsing and to maintain proper HTML structure
     * for further processing steps like sanitization and asset embedding.
     */
    private wrapRenderedTextWithHtmlIfNeeded(renderedText: string): string {
        if (renderedText.indexOf('<html>') !== 0) {
            renderedText = '<html>' + renderedText + '</html>';
        }
        return renderedText;
    }

    /**
     * Determines if the input text is HTML by checking for specific patterns
     * @param text - Text to analyze
     * @returns True if the text appears to be HTML, false otherwise
     * @remarks
     * The method checks for two patterns:
     * 1. Text wrapped in <html> tags
     * 2. Text starting with <p> tag and ending with </p> tag
     */
    private isHtml(text: string): boolean {
        let html = false;
        const m = text.match(/^<html>([\S\s]*)<\/html>$/);
        if (m && m.length === 2) {
            html = true;
            text = m[1];
        } else {
            html = /^<p>[\S\s]*<\/p>/.test(text);
        }
        return html;
    }

    /**
     * Sanitizes the HTML text by removing potentially harmful content
     * @param text - The HTML text to sanitize
     * @returns Sanitized HTML text
     * @remarks
     * This method can be skipped if skipSanitization option is set to true.
     * When sanitization is not skipped, it uses TagTransformingSanitizer to:
     * - Remove dangerous HTML tags and attributes
     * - Transform certain tags according to renderer options
     * - Apply security policies to links and embedded content
     */
    private sanitize(text: string): string {
        if (this.options.skipSanitization) {
            return text;
        }

        return this.tagTransformingSanitizer.sanitize(text);
    }
    /**
     * Validates the renderer options
     * @param o - Renderer options to validate
     * @throws Will throw if any option is invalid
     */
    private validate(o: RendererOptions) {
        ow(o, 'RendererOptions', ow.object);
        ow(o.baseUrl, 'RendererOptions.baseUrl', ow.string.nonEmpty);
        ow(o.breaks, 'RendererOptions.breaks', ow.boolean);
        ow(o.skipSanitization, 'RendererOptions.skipSanitization', ow.boolean);
        ow(o.addNofollowToLinks, 'RendererOptions.addNofollowToLinks', ow.boolean);
        ow(o.addTargetBlankToLinks, 'RendererOptions.addTargetBlankToLinks', ow.optional.boolean);
        ow(o.cssClassForInternalLinks, 'RendererOptions.cssClassForInternalLinks', ow.optional.string);
        ow(o.cssClassForExternalLinks, 'RendererOptions.cssClassForExternalLinks', ow.optional.string);
        ow(o.doNotShowImages, 'RendererOptions.doNotShowImages', ow.boolean);
        ow(o.ipfsPrefix, 'RendererOptions.ipfsPrefix', ow.optional.string);
        ow(o.assetsWidth, 'RendererOptions.assetsWidth', ow.number.integer.positive);
        ow(o.assetsHeight, 'RendererOptions.assetsHeight', ow.number.integer.positive);
        ow(o.imageProxyFn, 'RendererOptions.imageProxyFn', ow.function);
        ow(o.hashtagUrlFn, 'RendererOptions.hashtagUrlFn', ow.function);
        ow(o.usertagUrlFn, 'RendererOptions.usertagUrlFn', ow.function);
        ow(o.isLinkSafeFn, 'RendererOptions.isLinkSafeFn', ow.function);
        ow(o.addExternalCssClassToMatchingLinksFn, 'RendererOptions.addExternalCssClassToMatchingLinksFn', ow.function);
    }
}

/**
 * Configuration options for DefaultRenderer
 */
export interface RendererOptions {
    /** Base URL for resolving relative links */
    baseUrl: string;
    /** Enable line breaks in markdown */
    breaks: boolean;
    /** Skip HTML sanitization (use with caution) */
    skipSanitization: boolean;
    /** Allow script tags in output (dangerous) */
    allowInsecureScriptTags: boolean;
    /** Add nofollow attribute to links */
    addNofollowToLinks: boolean;
    /** Add target="_blank" to links */
    addTargetBlankToLinks?: boolean;
    /** CSS class to add to internal links */
    cssClassForInternalLinks?: string;
    /** CSS class to add to external links */
    cssClassForExternalLinks?: string;
    /** Disable image rendering */
    doNotShowImages: boolean;
    /** IPFS gateway prefix */
    ipfsPrefix?: string;
    /** Default width for embedded assets */
    assetsWidth: number;
    /** Default height for embedded assets */
    assetsHeight: number;
    /** Function to proxy image URLs */
    imageProxyFn: (url: string) => string;
    /** Function to generate hashtag URLs */
    hashtagUrlFn: (hashtag: string) => string;
    /** Function to generate user profile URLs */
    usertagUrlFn: (account: string) => string;
    /** Function to check if a link is safe */
    isLinkSafeFn: (url: string) => boolean;
    /** Function to determine if external CSS class should be added */
    addExternalCssClassToMatchingLinksFn: (url: string) => boolean;
    /** Optional array of renderer plugins */
    plugins?: RendererPlugin[];
}
