const HiveContentRenderer = require("../dist/index");

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

const input = `
# Sample post

and some content

Lets mention @engrave on #hive.
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
