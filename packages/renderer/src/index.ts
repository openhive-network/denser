import {DefaultRenderer} from './renderers/default/DefaultRenderer';
import {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';
import {TablePlugin} from './renderers/default/plugins/TablePlugin';
import {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
import {LinkSanitizer} from './security/LinkSanitizer';
import {Phishing} from './security/Phishing';
import {SecurityChecker} from './security/SecurityChecker';

// Main renderer
export {DefaultRenderer} from './renderers/default/DefaultRenderer';
export type {RendererOptions} from './renderers/default/DefaultRenderer';

// Plugins
export {TwitterPlugin} from './renderers/default/plugins/TwitterPlugin';
export {InstagramPlugin} from './renderers/default/plugins/InstagramPlugin';
export {TablePlugin} from './renderers/default/plugins/TablePlugin';
export type {RendererPlugin} from './renderers/default/plugins/RendererPlugin';

// Security
export {Phishing} from './security/Phishing';
export {SecurityChecker, SecurityError} from './security/SecurityChecker';
export {LinkSanitizer} from './security/LinkSanitizer';
export type {LinkSanitizerOptions} from './security/LinkSanitizer';

// Sanitization types
export type {PostContext, TagsSanitizerOptions} from './renderers/default/sanitization/TagTransformingSanitizer';

// DOM Parser types (useful for advanced usage)
export type {State as ParserState} from './renderers/default/embedder/HtmlDOMParser';
export {HtmlDOMParserError} from './renderers/default/embedder/HtmlDOMParser';

// Embedder types (for custom embedders)
export type {EmbedMetadata, EmbedSize} from './renderers/default/embedder/embedders/AbstractEmbedder';
export {AbstractEmbedder} from './renderers/default/embedder/embedders/AbstractEmbedder';

/**
 * Namespace object containing all major exports for browser/UMD usage.
 *
 * @example
 * ```html
 * <script src="https://unpkg.com/@hiveio/content-renderer"></script>
 * <script>
 *     const renderer = new HiveContentRenderer.DefaultRenderer({...});
 *     HiveContentRenderer.Phishing.addDomain('bad-site.com');
 *     // Check if content is safe before rendering
 *     if (HiveContentRenderer.SecurityChecker.containsDangerousContent(rawHtml)) {
 *         console.warn('Dangerous content detected!');
 *     }
 * </script>
 * ```
 */
export const HiveContentRenderer = {
    DefaultRenderer,
    TwitterPlugin,
    InstagramPlugin,
    TablePlugin,
    Phishing,
    SecurityChecker,
    LinkSanitizer
};

export default HiveContentRenderer;
