const HiveContentRenderer = require("@hiveio/content-renderer");

const renderer = new HiveContentRenderer.DefaultRenderer({
    baseUrl: "https://hive.blog/",
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addNofollowToLinks: true,
    addTargetBlankToLink: true,
    cssClassForInternalLinks: "hive-class",
    doNotShowImages: false,
    ipfsPrefix: "",
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url) => url,
    usertagUrlFn: (account) => "/@" + account,
    hashtagUrlFn: (hashtag) => "/trending/" + hashtag,
    isLinkSafeFn: (url) => true,
    addExternalCssClassToMatchingLinksFn: (url) => true,
});

const input = `
# Sample post

and some content

Lets mention @engrave on #hive.

[Hive Link](https://hive.io)
`;

const output = renderer.render(input);

console.log();
console.log("+-------------------------------+");
console.log("| @hiveio/content-renderer demo |");
console.log("+-------------------------------+");
console.log();
console.log(output);
console.log();
console.log();
