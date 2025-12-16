/**
 * Static configuration for content sanitization and iframe handling.
 *
 * This file is based on:
 * https://github.com/openhive-network/condenser/blob/master/src/app/utils/SanitizeConfig.js
 *
 * @module StaticConfig
 * @security This is a security-critical configuration file. Changes to the iframe
 * whitelist or allowed tags can have significant security implications.
 */

/**
 * Static configuration class for content sanitization and iframe handling.
 *
 * This class provides configuration settings for:
 * - Whitelisted iframe sources with their validation and transformation rules
 * - Text to display when images are hidden due to low ratings
 * - Allowed HTML tags for content rendering
 *
 * ## Supported Embed Platforms
 *
 * | Platform | Example URL | Notes |
 * |----------|-------------|-------|
 * | Twitter/X | twitter.com/user/status/123 | Converts to platform.twitter.com embed |
 * | Vimeo | player.vimeo.com/video/123 | Direct embed URL |
 * | YouTube | youtube.com/embed/xyz | Query strings stripped for security |
 * | SoundCloud | w.soundcloud.com/player/... | URL extracted and rebuilt |
 * | Twitch | player.twitch.tv/... | Direct embed URL |
 * | Spotify | open.spotify.com/embed/... | Supports playlists, tracks, albums, artists |
 * | 3Speak | 3speak.tv/embed?v=... | Hive-native video platform |
 *
 * @security The iframe whitelist uses regex patterns to validate embed sources.
 * Only URLs matching these patterns will be rendered as iframes. All other
 * iframe sources are replaced with a text placeholder.
 */
export class StaticConfig {
    public static sanitization = {
        /**
         * Whitelist of allowed iframe sources.
         *
         * Each entry contains:
         * - `re`: Regular expression to match the iframe src URL
         * - `fn`: Transform function that validates and normalizes the URL
         *
         * The transform function should return:
         * - The normalized embed URL (string) if valid
         * - `null` if the URL doesn't pass validation
         *
         * @security All regex patterns here have been reviewed for ReDoS vulnerabilities.
         * The eslint-disable comments are intentional after security review.
         */
        iframeWhitelist: [
            {
                /**
                 * Twitter/X.com embedded tweets (legacy format with @ prefix)
                 *
                 * Matches URLs like:
                 * - @https://twitter.com/user/status/12345
                 * - https://x.com/user/status/12345
                 * - twitter.com/status/12345
                 *
                 * The @ prefix is a legacy format from some Hive frontends.
                 * Tweet IDs are limited to 20 digits (Twitter's max ID length).
                 */
                // eslint-disable-next-line security/detect-unsafe-regex
                re: /^(?:@?(?:https?:)?\/\/)?(?:www\.)?(twitter|x)\.com\/(?:\w+\/status|status)\/(\d{1,20})/i,
                fn: (src: string) => {
                    if (!src) {
                        return null;
                    }
                    const cleanSrc = src.replace(/^(@|https?:\/\/)/, '');
                    const match = cleanSrc.match(/(?:twitter|x)\.com\/(?:\w+\/status|status)\/(\d{1,20})/i);
                    if (!match || match.length !== 2) {
                        return null;
                    }
                    return `https://platform.twitter.com/embed/Tweet.html?id=${match[1]}`;
                }
            },
            {
                /**
                 * Vimeo video embeds
                 *
                 * Matches URLs like:
                 * - https://player.vimeo.com/video/179213493
                 * - //player.vimeo.com/video/123456
                 *
                 * Extracts the video ID and reconstructs a clean embed URL
                 * to strip any potentially malicious query parameters.
                 */
                // eslint-disable-next-line security/detect-unsafe-regex
                re: /^(https?:)?\/\/player.vimeo.com\/video\/.*/i,
                fn: (src: string) => {
                    if (!src) {
                        return null;
                    }
                    const m = src.match(/https:\/\/player\.vimeo\.com\/video\/([0-9]+)/);
                    if (!m || m.length !== 2) {
                        return null;
                    }
                    return 'https://player.vimeo.com/video/' + m[1];
                }
            },
            {
                /**
                 * YouTube video embeds
                 *
                 * Matches URLs like:
                 * - https://www.youtube.com/embed/dQw4w9WgXcQ
                 * - //www.youtube.com/embed/xyz123
                 *
                 * Security: Query strings are stripped to prevent:
                 * - autoplay=1 (annoying auto-playing videos)
                 * - controls=0 (hiding player controls)
                 * - showinfo=0 (hiding video info)
                 * - Other parameters that could affect user experience or security
                 */
                // eslint-disable-next-line security/detect-unsafe-regex
                re: /^(https?:)?\/\/www.youtube.com\/embed\/.*/i,
                fn: (src: string) => {
                    // Strip query string to prevent autoplay and other unwanted parameters
                    return src.replace(/\?.+$/, '');
                }
            },
            {
                /**
                 * SoundCloud audio player embeds
                 *
                 * Matches URLs like:
                 * - https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/257659076
                 *
                 * The URL parameter is extracted and the embed is rebuilt with safe defaults:
                 * - auto_play=false (prevent auto-playing audio)
                 * - hide_related=false (show related tracks)
                 * - show_comments=true (show track comments)
                 * - show_user=true (show artist info)
                 * - show_reposts=false (don't show reposts)
                 * - visual=true (use visual waveform player)
                 */
                re: /^https:\/\/w.soundcloud.com\/player\/.*/i,
                fn: (src: string) => {
                    if (!src) {
                        return null;
                    }
                    // Extract the track/playlist URL from the embed URL
                    const m = src.match(/url=(.+?)&/);
                    if (!m || m.length !== 2) {
                        return null;
                    }
                    // Rebuild with safe parameters - notably auto_play=false
                    return `https://w.soundcloud.com/player/?url=${m[1]}&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&visual=true`;
                }
            },
            {
                /**
                 * Twitch.tv video/stream embeds
                 *
                 * Matches URLs like:
                 * - https://player.twitch.tv/?channel=ninja
                 * - //player.twitch.tv/?video=12345
                 *
                 * Passed through as-is since Twitch handles its own security.
                 */
                // eslint-disable-next-line security/detect-unsafe-regex
                re: /^(https?:)?\/\/player.twitch.tv\/.*/i,
                fn: (src: string) => {
                    return src;
                }
            },
            {
                /**
                 * Spotify embeds (music and podcasts)
                 *
                 * Matches URLs like:
                 * - https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M
                 * - https://open.spotify.com/embed-podcast/show/xyz
                 * - https://open.spotify.com/embed/track/abc
                 * - https://open.spotify.com/embed/album/def
                 * - https://open.spotify.com/embed/artist/ghi
                 *
                 * Supports both regular embeds and podcast-specific embeds.
                 */
                re: /^https:\/\/open\.spotify\.com\/(embed|embed-podcast)\/(playlist|show|episode|album|track|artist)\/(.*)/i,
                fn: (src: string) => {
                    return src;
                }
            },
            {
                /**
                 * 3Speak video embeds (embed URL format)
                 *
                 * 3Speak is the Hive-native decentralized video platform.
                 *
                 * Matches URLs like:
                 * - https://3speak.tv/embed?v=username/permlink
                 * - https://3speak.online/embed?v=username/permlink
                 * - //3speak.co/embed?v=username/permlink
                 *
                 * Normalizes all 3speak domains to 3speak.tv for consistency.
                 */
                // eslint-disable-next-line security/detect-unsafe-regex
                re: /^(?:https?:)?\/\/(?:3speak\.(?:tv|online|co))\/embed\?v=([^&\s]+)/i,
                fn: (src: string) => {
                    if (!src) return null;
                    const match = src.match(/3speak\.(?:tv|online|co)\/embed\?v=([^&\s]+)/i);
                    if (!match || match.length !== 2) return null;
                    // Normalize to 3speak.tv domain
                    return `https://3speak.tv/embed?v=${match[1]}`;
                }
            },
            {
                /**
                 * 3Speak video embeds (watch URL format, auto-converted to embed)
                 *
                 * Converts watch URLs to embed URLs for consistent rendering.
                 *
                 * Matches URLs like:
                 * - https://3speak.tv/watch?v=username/permlink
                 * - https://3speak.online/watch?v=username/permlink
                 */
                // eslint-disable-next-line security/detect-unsafe-regex
                re: /^(?:https?:)?\/\/(?:3speak\.(?:tv|online|co))\/watch\?v=([^&\s]+)/i,
                fn: (src: string) => {
                    if (!src) return null;
                    const match = src.match(/3speak\.(?:tv|online|co)\/watch\?v=([^&\s]+)/i);
                    if (!match || match.length !== 2) return null;
                    // Convert watch URL to embed URL
                    return `https://3speak.tv/embed?v=${match[1]}`;
                }
            },
            {
                /**
                 * Twitter/X.com embedded tweets (standard format)
                 *
                 * This is a duplicate pattern to catch standard Twitter/X URLs
                 * that weren't matched by the first pattern (legacy @ prefix format).
                 *
                 * Matches URLs like:
                 * - https://twitter.com/user/status/12345
                 * - https://x.com/user/status/12345
                 */
                re: /^(?:https:)\/\/(?:www\.)?(twitter|x)\.com\/(?:\w+\/status|status)\/(\d{1,20})/i,
                fn: (src: string) => {
                    if (!src) {
                        return null;
                    }
                    const match = src.match(/(?:twitter|x)\.com\/(?:\w+\/status|status)\/(\d{1,20})/i);
                    if (!match || match.length !== 2) {
                        return null;
                    }
                    return `https://platform.twitter.com/embed/Tweet.html?id=${match[1]}`;
                }
            }
        ],

        /**
         * Default text shown when images are hidden due to content ratings.
         * This message is displayed instead of the image when `doNotShowImages` is enabled.
         */
        noImageText: '(Image not shown due to low ratings)',

        /**
         * Whitelist of allowed HTML tags in rendered content.
         *
         * These tags are considered safe for user-generated content.
         * Any tags not in this list will be stripped during sanitization.
         *
         * Categories:
         * - Layout: div, center, br, hr
         * - Text formatting: p, b, i, em, strong, del, strike, sup, sub, q
         * - Lists: ul, ol, li
         * - Headings: h1-h6
         * - Links & Media: a, img, iframe (iframes validated against whitelist)
         * - Code: pre, code
         * - Quotes: blockquote
         * - Tables: table, thead, tbody, tr, th, td
         * - Interactive: details, summary (collapsible content)
         *
         * @security Tags like script, style, form, input are intentionally excluded
         * to prevent XSS attacks and unwanted functionality injection.
         */
        allowedTags: `
    div, iframe, del,
    a, p, b, i, q, br, ul, li, ol, img, h1, h2, h3, h4, h5, h6, hr,
    blockquote, pre, code, em, strong, center, table, thead, tbody, tr, th, td,
    strike, sup, sub, details, summary
`
            .trim()
            .split(/,\s*/)
    };
}
