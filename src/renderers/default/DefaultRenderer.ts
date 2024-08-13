import ow from 'ow';
import {Remarkable} from 'remarkable';
import {SecurityChecker} from '../../security/SecurityChecker';
import {HtmlDOMParser} from './embedder/HtmlDOMParser';
import {Localization, LocalizationOptions} from './Localization';
import type {RendererPlugin} from './plugins/RendererPlugin';
import {PreliminarySanitizer} from './sanitization/PreliminarySanitizer';
import {TagTransformingSanitizer} from './sanitization/TagTransformingSanitizer';

export class DefaultRenderer {
    private options: RendererOptions;
    private tagTransformingSanitizer: TagTransformingSanitizer;
    private domParser: HtmlDOMParser;
    private plugins: RendererPlugin[] = [];

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

    public render(input: string): string {
        ow(input, 'input', ow.string.nonEmpty);
        return this.doRender(input);
    }

    private doRender(text: string): string {
        // Pre-process with plugins
        text = this.runPluginPhase('preProcess', text);

        text = PreliminarySanitizer.preliminarySanitize(text);
        const isHtml = this.isHtml(text);
        text = isHtml ? text : this.renderMarkdown(text);

        text = this.wrapRenderedTextWithHtmlIfNeeded(text);
        text = this.domParser.parse(text).getParsedDocumentAsString();
        text = this.sanitize(text);
        SecurityChecker.checkSecurity(text, {allowScriptTag: this.options.allowInsecureScriptTags});
        text = this.domParser.embedder.insertAssets(text);

        // Post-process with plugins
        text = this.runPluginPhase('postProcess', text);

        return text;
    }

    private runPluginPhase(phase: 'preProcess' | 'postProcess', text: string): string {
        return this.plugins.reduce((processedText, plugin) => {
            const processor = plugin[phase];
            return processor ? processor(processedText) : processedText;
        }, text);
    }

    private renderMarkdown(text: string): string {
        const renderer = new Remarkable({
            html: true, // remarkable renders first then sanitize runs...
            breaks: this.options.breaks,
            typographer: false, // https://github.com/jonschlinkert/remarkable/issues/142#issuecomment-221546793
            quotes: '“”‘’'
        });
        return renderer.render(text);
    }

    private wrapRenderedTextWithHtmlIfNeeded(renderedText: string): string {
        // If content isn't wrapped with an html element at this point, add it.
        if (renderedText.indexOf('<html>') !== 0) {
            renderedText = '<html>' + renderedText + '</html>';
        }
        return renderedText;
    }

    private isHtml(text: string): boolean {
        let html = false;
        // See also ReplyEditor isHtmlTest
        const m = text.match(/^<html>([\S\s]*)<\/html>$/);
        if (m && m.length === 2) {
            html = true;
            text = m[1];
        } else {
            // See also ReplyEditor isHtmlTest
            html = /^<p>[\S\s]*<\/p>/.test(text);
        }
        return html;
    }

    private sanitize(text: string): string {
        if (this.options.skipSanitization) {
            return text;
        }

        return this.tagTransformingSanitizer.sanitize(text);
    }

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
export interface RendererOptions {
    baseUrl: string;
    breaks: boolean;
    skipSanitization: boolean;
    allowInsecureScriptTags: boolean;
    addNofollowToLinks: boolean;
    addTargetBlankToLinks?: boolean;
    cssClassForInternalLinks?: string;
    cssClassForExternalLinks?: string;
    doNotShowImages: boolean;
    ipfsPrefix?: string;
    assetsWidth: number;
    assetsHeight: number;
    imageProxyFn: (url: string) => string;
    hashtagUrlFn: (hashtag: string) => string;
    usertagUrlFn: (account: string) => string;
    isLinkSafeFn: (url: string) => boolean;
    addExternalCssClassToMatchingLinksFn: (url: string) => boolean;
    plugins?: RendererPlugin[];
}
