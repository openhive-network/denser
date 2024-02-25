# @hiveio/content-renderer

[![npm](https://img.shields.io/npm/v/@hiveio/content-renderer.svg?style=flat-square)](https://www.npmjs.com/package/@hiveio/content-renderer) [![](https://img.badgesize.io/https:/unpkg.com/@hiveio/content-renderer@1.0.2/dist/browser/hive-content-renderer.min.js.svg?compression=gzip)](https://www.npmjs.com/package/@hiveio/content-renderer) [![License](https://img.shields.io/github/license/wise-team/steem-content-renderer.svg?style=flat-square)](https://github.com/wise-team/steem-content-renderer/blob/master/LICENSE) [![](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

👉 **[Online demo](https://hive.pages.syncad.com/hive-renderer/)**

Portable library that renders Hive posts and comments to string. It supports markdown and html and mimics the behaviour of condenser frontend.

Features:

- supports markdown and html
- sanitizes html and protects from XSS
- embeds images, videos, and other assets via links or iframes
- ensures links are safe to display and begins with `https://` protocol
- linkify #tags and @username mentions
- proxify images if needed and appropriate function is provided

**Credit**: this library is based on the code from condenser. It's aim is to allow other projects display Hive content the right way without porting the same code over and over.

## Server side usage

Installation:

```bash
$ npm install --save @hiveio/content-renderer
```

**Typescript:**

```typescript
import { DefaultRenderer } from "@hiveio/content-renderer";

const renderer = new DefaultRenderer({
    baseUrl: "https://hive.blog/",
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addNofollowToLinks: true,
    doNotShowImages: false,
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url: string) => url,
    usertagUrlFn: (account: string) => "/@" + account,
    hashtagUrlFn: (hashtag: string) => "/trending/" + hashtag,
    isLinkSafeFn: (url: string) => true,
    addExternalCssClassToMatchingLinksFn: (url: string) => true,
    ipfsPrefix: "https://ipfs.io/ipfs/" // IPFS gateway to display ipfs images
});

const safeHtmlStr = renderer.render(postContent);
```

## Browser usage:

See [demo](https://hive.pages.syncad.com/hive-renderer/) and [its source](https://gitlab.syncad.com/hive/hive-renderer/-/blob/master/sample/live-demo.html).

```html

<script src="https://unpkg.com/@hiveio/content-renderer"></script>
<script>
    const renderer = new HiveContentRenderer.DefaultRenderer({
        baseUrl: "https://hive.blog/",
        breaks: true,
        skipSanitization: false,
        allowInsecureScriptTags: false,
        addNofollowToLinks: true,
        doNotShowImages: false,
        cssClassForInternalLinks: "link",
        cssClassForExternalLinks: "external",
        assetsWidth: 640,
        assetsHeight: 480,
        imageProxyFn: (url) => url,
        usertagUrlFn: (account) => "/@" + account,
        hashtagUrlFn: (hashtag) => "/trending/" + hashtag,
        isLinkSafeFn: (url) => true,
        addExternalCssClassToMatchingLinksFn: (url: string) => true,
        ipfsPrefix: "https://ipfs.io/ipfs/"
    });

    $(document).ready(() => {
        const renderMarkdownBtnElem = $("#render-button");
        const inputElem = $("#input");
        const outputElem = $("#output");
        const outputMarkupElem = $("#output-markup");

        renderMarkdownBtnElem.on("click", () => {
            const input = inputElem.val();
            const output = renderer.render(input);

            console.log("Rendered", output);
            outputElem.html(output);
            outputMarkupElem.text(output);
        });
    });
</script>
</body>
</html>
```

## Renderer options

You can pass options to the renderer to customize its behaviour. Here is the list of available 

```typescript
export interface RendererOptions {
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
    addTargetBlankToLinks?: boolean;
    cssClassForInternalLinks?: string;
    cssClassForExternalLinks?: string;
    ipfsPrefix?: string;
}
```

## Options explained

- `baseUrl` - base url of the website. It's used to create links.
- `breaks` - if true, newlines characters (`\n`) are converted to `<br>` tags. This only applies to markdown input. Usually you want to set this to `true`.
- `skipSanitization` - if true, html is not sanitized. This is not recommended, as it can lead to XSS attacks. Set this to `false` always for production use.
- `allowInsecureScriptTags` - if true, script tags are not removed from the input. This is not recommended, as it can lead to XSS attacks. Set this to `false` always for production use.
- `addNofollowToLinks` - if true, `rel="nofollow"` is added to all links.
- `addTargetBlankToLinks` - if true, `target="_blank"` is added to all links.
- `doNotShowImages` - if true, images are not being rendered as `<img>` tags but as `<pre>` tags with the image url.
- `assetsWidth` - width of the images and embeds in pixels.
- `assetsHeight` - height of the images and embeds in pixels.
- `imageProxyFn` - function that takes an image url and returns a proxied url. This can be useful to use a proxy to display images. It's also useful to resize images.
- `hashtagUrlFn` - function that takes a hashtag and returns a url to the hashtag page.
- `usertagUrlFn` - function that takes a usertag and returns a url to the user profile. This might be useful if you want to differentiate between internal and external links for some specific accounts, like bad actors.
- `isLinkSafeFn` - function that takes a link and returns true if the link is safe to display. This can be useful to filter out links to phishing sites or other malicious content. If this function returns false, the link is not displayed and title is set to phishing warning.
- `addExternalCssClassToMatchingLinksFn` - function that takes a link and returns true if the link should have `cssClassForExternalLinks` added to it. This can be useful to differentiate appearance between internal and external links.
- `addTargetBlankToLinks` - if true, `target="_blank"` is added to all links.
- `cssClassForInternalLinks` - if set, this class is added to all internal links.
- `cssClassForExternalLinks` - if set, this class is added to all external links if `addExternalCssClassToMatchingLinksFn` returns true.
- `ipfsPrefix` - if set, this prefix is added to all IPFS links. This can be useful if you want to use a public IPFS gateway to display ipfs images. It may or may not end with a slash.

## Development

Library is written in typescript and expects NodeJS v20 or higher. If you use nvm, you can run `nvm install` and `nvm use` to switch to the right version automatically.

To start developing:

```bash
$ npm install
$ npm run build
```

## Testing

### Unit tests

The library is tested with mocha and chai. To run unit tests:
```bash
$ npm run test
```

### Integration tests

Integration tests are run with testcafe. Please note you need to rebuild the library before running the tests in order to have the latest version of the library embedded in the test page. Run `npm run build` before running the tests.

To run integration tests with your default browser (chrome):
```bash
$ npm run verify:chrome
$ npm run verify:firefox
```

## Linting

In order to provide consistent code style, the library is linted with eslint with prettier and typescript plugin. This is enforced in CI and git hooks.

To run linter:
```bash
$ npm run lint
```

## Semantic versioning

Library follows semantic versioning and is released to NPM registry automatically with CI after a merge to master. CI and husky is configured in a way to enforce [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). Git hooks are installed to enforce this in local development.

Versioning is done automatically with `semantic-release`. Please note that the version is bumped automatically based on the commit messages.