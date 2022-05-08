# @hiveio/content-renderer

[![npm](https://img.shields.io/npm/v/@hiveio/content-renderer.svg?style=flat-square)](https://www.npmjs.com/package/@hiveio/content-renderer) [![License](https://img.shields.io/github/license/wise-team/steem-content-renderer.svg?style=flat-square)](https://github.com/wise-team/steem-content-renderer/blob/master/LICENSE) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)


👉 **[Online demo](https://hive.pages.syncad.com/hive-renderer/)**

Portable library that renders Hive posts and comments to string. It supports markdown and html and mimics the behaviour of condenser frontend.

Features:

-   supports markdown and html

-   sanitizes html and protects from XSS

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
    ipfsPrefix: "",
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url: string) => url,
    usertagUrlFn: (account: string) => "/@" + account,
    hashtagUrlFn: (hashtag: string) => "/trending/" + hashtag,
    isLinkSafeFn: (url: string) => true,
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
        ipfsPrefix: "",
        assetsWidth: 640,
        assetsHeight: 480,
        imageProxyFn: (url) => url,
        usertagUrlFn: (account) => "/@" + account,
        hashtagUrlFn: (hashtag) => "/trending/" + hashtag,
        isLinkSafeFn: (url) => true,
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
