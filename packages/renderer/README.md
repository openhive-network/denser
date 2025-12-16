# @hive/renderer

[![npm](https://img.shields.io/npm/v/@hiveio/content-renderer.svg?style=flat-square)](https://www.npmjs.com/package/@hiveio/content-renderer) [![](https://img.badgesize.io/https:/unpkg.com/@hiveio/content-renderer@1.0.2/dist/browser/hive-content-renderer.min.js.svg?compression=gzip)](https://www.npmjs.com/package/@hiveio/content-renderer) [![License](https://img.shields.io/github/license/wise-team/steem-content-renderer.svg?style=flat-square)](https://github.com/wise-team/steem-content-renderer/blob/master/LICENSE) [![](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> **[Online Demo](https://hive.pages.syncad.com/hive-renderer/)**

A security-focused content rendering library for the Hive blockchain. Converts Markdown and HTML content to safe HTML output with embedded media support, sanitization, and phishing protection.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Server-side (Node.js)](#server-side-nodejs)
  - [Browser](#browser)
- [Configuration](#configuration)
  - [Required Options](#required-options)
  - [Optional Options](#optional-options)
  - [Options Reference](#options-reference)
- [Plugins](#plugins)
  - [Built-in Plugins](#built-in-plugins)
  - [Creating Custom Plugins](#creating-custom-plugins)
- [Supported Embed Platforms](#supported-embed-platforms)
- [Security](#security)
  - [Critical Settings](#critical-settings)
  - [Multi-Layer Protection](#multi-layer-protection)
  - [Security APIs](#security-apis)
  - [CSP Recommendations](#csp-recommendations)
- [Architecture](#architecture)
  - [Rendering Pipeline](#rendering-pipeline)
  - [Package Structure](#package-structure)
- [Error Handling](#error-handling)
- [Development](#development)
- [Testing](#testing)
- [Credits](#credits)

## Features

- **Markdown & HTML Support** - Renders both formats with consistent output
- **XSS Protection** - Multi-layer sanitization with 25+ attack pattern detection
- **Media Embedding** - YouTube, Vimeo, Twitch, Spotify, 3Speak, Twitter/X, Instagram
- **Phishing Detection** - 900+ known malicious domains with runtime extension
- **Link Safety** - Protocol validation, obfuscation detection, lookalike domain protection
- **Hashtag & Mention Linking** - Automatic `#tag` and `@username` linkification
- **Image Proxying** - Configurable image URL transformation
- **IPFS Support** - Automatic gateway prefixing for IPFS content
- **Plugin System** - Extensible pre/post-processing hooks
- **Zero External Calls** - Synchronous execution, no network dependencies

## Installation

```bash
npm install @hive/renderer
# or
pnpm add @hive/renderer
# or
yarn add @hive/renderer
```

**Requirements:** Node.js >= 20

## Quick Start

### Server-side (Node.js)

```typescript
import { DefaultRenderer } from "@hive/renderer";

const renderer = new DefaultRenderer({
    baseUrl: "https://hive.blog/",
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addNofollowToLinks: true,
    doNotShowImages: false,
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url) => url,
    usertagUrlFn: (account) => `/@${account}`,
    hashtagUrlFn: (hashtag) => `/trending/${hashtag}`,
    isLinkSafeFn: (url) => true,
    addExternalCssClassToMatchingLinksFn: (url) => true,
    ipfsPrefix: "https://ipfs.io/ipfs/"
});

const safeHtml = renderer.render(postContent);
```

### Browser

Include via CDN and use the `HiveContentRenderer` global:

```html
<script src="https://unpkg.com/@hive/renderer"></script>
<script>
    const renderer = new HiveContentRenderer.DefaultRenderer({
        baseUrl: "https://hive.blog/",
        breaks: true,
        skipSanitization: false,
        allowInsecureScriptTags: false,
        addNofollowToLinks: true,
        doNotShowImages: false,
        assetsWidth: 640,
        assetsHeight: 480,
        imageProxyFn: (url) => url,
        usertagUrlFn: (account) => `/@${account}`,
        hashtagUrlFn: (hashtag) => `/trending/${hashtag}`,
        isLinkSafeFn: (url) => true,
        addExternalCssClassToMatchingLinksFn: (url) => true,
        ipfsPrefix: "https://ipfs.io/ipfs/"
    });

    const output = renderer.render(markdownInput);
    document.getElementById("content").innerHTML = output;
</script>
```

See the [live demo](https://hive.pages.syncad.com/hive-renderer/) and its [source code](https://gitlab.syncad.com/hive/hive-renderer/-/blob/master/sample/live-demo.html).

## Configuration

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `baseUrl` | `string` | Base URL for resolving relative links (e.g., `"https://hive.blog/"`) |
| `breaks` | `boolean` | Convert newlines to `<br>` tags in Markdown |
| `skipSanitization` | `boolean` | **Must be `false` in production** |
| `allowInsecureScriptTags` | `boolean` | **Must be `false` in production** |
| `addNofollowToLinks` | `boolean` | Add `rel="nofollow"` to links |
| `doNotShowImages` | `boolean` | Hide images (show URL in `<pre>` instead) |
| `assetsWidth` | `number` | Embed width in pixels |
| `assetsHeight` | `number` | Embed height in pixels |
| `imageProxyFn` | `(url: string) => string` | Transform image URLs (for proxying/resizing) |
| `usertagUrlFn` | `(account: string) => string` | Generate `@mention` link URLs |
| `hashtagUrlFn` | `(hashtag: string) => string` | Generate `#hashtag` link URLs |
| `isLinkSafeFn` | `(url: string) => boolean` | Custom link safety validation |
| `addExternalCssClassToMatchingLinksFn` | `(url: string) => boolean` | Apply external link styling |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxInputLength` | `number` | `1048576` | Max input length (bytes). Set to `0` to disable |
| `addTargetBlankToLinks` | `boolean` | `false` | Add `target="_blank"` to links |
| `cssClassForInternalLinks` | `string` | `undefined` | CSS class for internal links |
| `cssClassForExternalLinks` | `string` | `undefined` | CSS class for external links |
| `ipfsPrefix` | `string` | `undefined` | IPFS gateway prefix (e.g., `"https://ipfs.io/ipfs/"`) |
| `plugins` | `RendererPlugin[]` | `[]` | Custom renderer plugins |

### Options Reference

```typescript
interface RendererOptions {
    baseUrl: string;
    breaks: boolean;
    skipSanitization: boolean;
    allowInsecureScriptTags: boolean;
    addNofollowToLinks: boolean;
    doNotShowImages: boolean;
    assetsWidth: number;
    assetsHeight: number;
    imageProxyFn: (url: string) => string;
    hashtagUrlFn: (hashtag: string) => string;
    usertagUrlFn: (account: string) => string;
    isLinkSafeFn: (url: string) => boolean;
    addExternalCssClassToMatchingLinksFn: (url: string) => boolean;
    // Optional
    maxInputLength?: number;
    addTargetBlankToLinks?: boolean;
    cssClassForInternalLinks?: string;
    cssClassForExternalLinks?: string;
    ipfsPrefix?: string;
    plugins?: RendererPlugin[];
}
```

## Plugins

### Built-in Plugins

The renderer includes several optional plugins for enhanced functionality:

#### TwitterPlugin

Embeds Twitter/X posts using the Twitter Widget API.

```typescript
import { DefaultRenderer, TwitterPlugin } from "@hive/renderer";

const twitterPlugin = new TwitterPlugin();

const renderer = new DefaultRenderer({
    // ...options
    plugins: [twitterPlugin]
});
```

**Features:**
- Dark mode detection and support
- LRU cache for rendered tweets (max 100)
- Automatic Twitter widget script loading

#### InstagramPlugin

Embeds Instagram posts and reels.

```typescript
import { DefaultRenderer, InstagramPlugin } from "@hive/renderer";

const instagramPlugin = new InstagramPlugin();

const renderer = new DefaultRenderer({
    // ...options
    plugins: [instagramPlugin]
});
```

**Supported URL patterns:**
- Posts: `instagram.com/p/{id}`
- Reels: `instagram.com/reel/{id}`
- Profiles: `instagram.com/{username}`

#### TablePlugin

Adds GFM-style table rendering to Markdown.

```typescript
import { DefaultRenderer, TablePlugin } from "@hive/renderer";

const renderer = new DefaultRenderer({
    // ...options
    plugins: [new TablePlugin()]
});
```

#### SpoilerPlugin (Internal)

Adds spoiler/details block syntax to Markdown:

```markdown
> ! This is hidden content (default "Reveal spoiler" text)
> ![Custom Button] This uses custom reveal text
```

Renders as `<details><summary>...</summary>...</details>`.

### Creating Custom Plugins

Plugins can transform content before and/or after the main rendering pipeline:

```typescript
import type { RendererPlugin } from "@hive/renderer";

const myPlugin: RendererPlugin = {
    name: "my-plugin",

    // Transform input before rendering
    preProcess(text: string): string {
        return text.replace(/foo/g, "bar");
    },

    // Transform output after rendering
    postProcess(html: string): string {
        return html.replace(/<p>/g, '<p class="custom">');
    }
};

const renderer = new DefaultRenderer({
    // ...options
    plugins: [myPlugin]
});
```

## Supported Embed Platforms

Media from these platforms is automatically embedded via secure iframes:

| Platform | URL Patterns | Notes |
|----------|--------------|-------|
| **YouTube** | `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, `youtube.com/shorts/` | Query strings stripped for security |
| **Vimeo** | `vimeo.com/{id}`, `player.vimeo.com/video/{id}` | Video ID validated |
| **Twitch** | `player.twitch.tv/` | Channel and video embeds |
| **Spotify** | `open.spotify.com/{type}/{id}` | Tracks, albums, playlists, artists, shows, episodes |
| **SoundCloud** | `w.soundcloud.com/player/` | Auto-play disabled |
| **3Speak** | `3speak.tv/watch?v=`, `3speak.tv/embed?v=` | Hive-native video platform |
| **Twitter/X** | `twitter.com/.../status/...`, `x.com/.../status/...` | Requires TwitterPlugin |
| **Instagram** | `instagram.com/p/...`, `instagram.com/reel/...` | Requires InstagramPlugin |

Iframes from non-whitelisted sources display: `(Unsupported [url])`

## Security

### Critical Settings

**Always use these settings in production:**

```typescript
{
    skipSanitization: false,       // NEVER set to true
    allowInsecureScriptTags: false // NEVER set to true
}
```

### Multi-Layer Protection

| Attack Type | Protection |
|-------------|------------|
| **XSS attacks** | Multi-layer sanitization + 25+ pattern detection |
| **Script injection** | Tag whitelist + SecurityChecker validation |
| **Event handlers** | Blocked patterns (`onclick=`, `onerror=`, etc.) |
| **Dangerous protocols** | Blocked `javascript:`, `vbscript:`, `data:` URLs |
| **Encoded attacks** | HTML entity and URL encoding normalization |
| **Phishing** | 900+ known domains + lookalike detection |
| **Pseudo-local URLs** | Misleading link text detection |
| **Malicious iframes** | Strict whitelist (YouTube, Vimeo, etc.) |
| **DoS attacks** | Input/URL length limits |
| **Tab-nabbing** | Automatic `rel="noopener noreferrer"` |
| **CSS injection** | Style attributes restricted to safe values |

### Security APIs

#### Pre-render Content Check

```typescript
import { SecurityChecker } from "@hive/renderer";

// Quick dangerous content check
if (SecurityChecker.containsDangerousContent(rawContent)) {
    console.warn("Dangerous content detected");
}

// View all checked patterns
const patterns = SecurityChecker.getCheckedPatterns();
```

#### Phishing Domain Management

```typescript
import { Phishing } from "@hive/renderer";

// Check if URL looks phishy
if (Phishing.looksPhishy("https://steemlt.com")) {
    console.warn("Phishing URL detected");
}

// Add custom domains
Phishing.addDomain("phishing-site.com");
Phishing.addDomains(["domain1.com", "domain2.com"]);

// Get domain lists
const allDomains = Phishing.getDomains();        // Built-in + custom
const customOnly = Phishing.getCustomDomains();  // Custom only
console.log(`Blocking ${Phishing.getDomainCount()} domains`);
```

#### Link Sanitization

```typescript
import { LinkSanitizer } from "@hive/renderer";

// Get blocked protocols
const dangerous = LinkSanitizer.getDangerousProtocols();
// ['javascript:', 'vbscript:', 'data:', 'file:', 'blob:', ...]

// Get URL length limit
const maxLength = LinkSanitizer.getMaxUrlLength(); // 2083
```

#### Custom Link Validation

```typescript
const renderer = new DefaultRenderer({
    // ...options
    isLinkSafeFn: (url: string) => {
        const blockedPatterns = [/malware/, /phishing/];
        return !blockedPatterns.some(p => p.test(url));
    }
});
```

### CSP Recommendations

Configure Content Security Policy headers for additional protection:

```http
Content-Security-Policy:
    default-src 'self';
    img-src 'self' https: data:;
    frame-src
        https://www.youtube.com
        https://player.vimeo.com
        https://player.twitch.tv
        https://platform.twitter.com
        https://open.spotify.com
        https://w.soundcloud.com
        https://3speak.tv;
    script-src 'self';
    style-src 'self' 'unsafe-inline';
```

## Architecture

### Rendering Pipeline

```
Input (Markdown/HTML)
         │
         ▼
┌────────────────────────┐
│  Plugin Pre-process    │  Optional custom transformations
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Preliminary Sanitize  │  Remove HTML comments
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Format Detection      │  Detect Markdown vs HTML
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Markdown Rendering    │  Convert to HTML (Remarkable)
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  DOM Parsing           │  Process links, images, embeds
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Tag Sanitization      │  Whitelist-based HTML sanitization
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Security Check        │  Final XSS pattern verification
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Asset Embedding       │  Replace markers with iframes
└────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Plugin Post-process   │  Optional custom transformations
└────────────────────────┘
         │
         ▼
     Safe HTML Output
```

### Package Structure

```
packages/renderer/
├── src/
│   ├── index.ts                    # Main exports
│   ├── Log.ts                      # Pino-based logging
│   ├── renderers/
│   │   └── default/
│   │       ├── DefaultRenderer.ts  # Main renderer class
│   │       ├── StaticConfig.ts     # Security configuration
│   │       ├── Localization.ts     # i18n support
│   │       ├── embedder/
│   │       │   ├── HtmlDOMParser.ts
│   │       │   ├── AssetEmbedder.ts
│   │       │   ├── embedders/      # Platform-specific embedders
│   │       │   │   ├── AbstractEmbedder.ts
│   │       │   │   ├── YoutubeEmbedder.ts
│   │       │   │   ├── VimeoEmbedder.ts
│   │       │   │   ├── SpotifyEmbedder.ts
│   │       │   │   ├── TwitchEmbedder.ts
│   │       │   │   └── ThreeSpeakEmbedder.ts
│   │       │   └── utils/
│   │       │       ├── Links.ts
│   │       │       ├── AccountNameValidator.ts
│   │       │       └── BadActorList.ts
│   │       ├── plugins/
│   │       │   ├── RendererPlugin.ts
│   │       │   ├── TwitterPlugin.ts
│   │       │   ├── InstagramPlugin.ts
│   │       │   ├── SpoilerPlugin.ts
│   │       │   └── TablePlugin.ts
│   │       └── sanitization/
│   │           ├── PreliminarySanitizer.ts
│   │           └── TagTransformingSanitizer.ts
│   └── security/
│       ├── SecurityChecker.ts      # XSS pattern detection
│       ├── LinkSanitizer.ts        # URL security validation
│       └── Phishing.ts             # Phishing domain detection
└── package.json
```

## Error Handling

The renderer throws typed errors for different failure modes:

```typescript
import {
    DefaultRenderer,
    SecurityError,
    HtmlDOMParserError
} from "@hive/renderer";

try {
    const output = renderer.render(input);
} catch (error) {
    if (error instanceof SecurityError) {
        // Script tags or other security violations
        console.error("Security violation:", error.message);
    } else if (error instanceof HtmlDOMParserError) {
        // Failed to parse HTML structure
        console.error("Parsing error:", error.message);
    } else if (error.message.includes("Input exceeds maximum")) {
        // Input too large (exceeds maxInputLength)
        console.error("Input too large:", error.message);
    } else {
        // Validation errors (empty input, invalid options)
        console.error("Validation error:", error.message);
    }
}
```

## Development

### Setup

```bash
# Clone and install
git clone https://gitlab.syncad.com/hive/denser.git
cd denser
pnpm install

# Build the renderer package
pnpm --filter @hive/renderer build
```

### Scripts

```bash
# Lint
pnpm --filter @hive/renderer lint
pnpm --filter @hive/renderer lint:fix

# Test
pnpm --filter @hive/renderer test
```

### Requirements

- Node.js >= 20
- pnpm (check `.gitlab-ci.yml` for exact version)

## Testing

### Unit Tests

```bash
pnpm --filter @hive/renderer test
```

### Integration Tests

Rebuild before running integration tests:

```bash
pnpm --filter @hive/renderer build
pnpm --filter @hive/renderer verify:chrome
pnpm --filter @hive/renderer verify:firefox
```

## Semantic Versioning

This library follows [Semantic Versioning](https://semver.org/) and [Conventional Commits](https://www.conventionalcommits.org/). Releases are automated via `semantic-release` on merge to master.

## Credits

This library is based on the rendering code from [Condenser](https://github.com/steemit/condenser), adapted to be a portable, reusable package for the Hive ecosystem.
