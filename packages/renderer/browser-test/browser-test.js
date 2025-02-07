import {ClientFunction, Selector} from 'testcafe';

fixture`Getting Started`.page`./index.html`;

const defaultOptions = {
    baseUrl: 'https://hive.blog/',
    breaks: true,
    skipSanitization: false,
    allowInsecureScriptTags: false,
    addTargetBlankToLinks: true,
    addNofollowToLinks: true,
    cssClassForInternalLinks: 'hive-class',
    cssClassForExternalLinks: 'hive-class external',
    doNotShowImages: false,
    assetsWidth: 640,
    assetsHeight: 480,
    imageProxyFn: (url) => url,
    usertagUrlFn: (account) => `https://hive.blog/@${account}`,
    hashtagUrlFn: (hashtag) => `/trending/${hashtag}`,
    isLinkSafeFn: (url) => true, // !!url.match(/^(\/(?!\/)|https:\/\/hive.blog)/),
    addExternalCssClassToMatchingLinksFn: (url) => !url.match(/^(\/(?!\/)|https:\/\/hive.blog)/)
};

const renderInBrowser = ClientFunction((options, markup) => {
    // Create a new instance of SpoilerPlugin directly
    // To test custom plugins
    const spoilerPlugin = {
        name: 'spoiler',
        preProcess: (text) => {
            return text.replace(
                /^>! *\[(.*?)\] *([\s\S]*?)(?=^>! *\[|$)/gm,
                (_, title, content) => {
                    const cleanContent = content
                        .split('\n')
                        .map(line => line.replace(/^> ?/, '').trim())
                        .join('\n')
                        .trim();

                    return `<details class="spoiler">
                        <summary>${title}</summary>
                        ${cleanContent}
                    </details>`;
                }
            );
        }
    };

    const mergedOptions = Object.assign({}, options, {
        plugins: [spoilerPlugin]
    });
    
    const renderer = new HiveContentRenderer.DefaultRenderer(mergedOptions);
    return renderer.render(markup);
});

test('Renders properly simple markup', async (t) => {
    const markup = '# H1';

    await t
        .click(Selector('#awaiter'))
        .expect(renderInBrowser({...defaultOptions}, markup))
        .eql('<h1>H1</h1>\n');
});

test('Does not crash on mixed-img markup', async (t) => {
    const markup = `<img src="![Sacrifice The Truth Logo.jpg](https://images.hive.blog/DQmUjNstssuPJpjPDDWfRnw1x2tY6AWWKcajDMGpPLA5iJf/Sacrifice%20The%20Truth%20Logo.jpg)"/>`;
    const expected = `<p><img src="brokenimg.jpg" /></p>\n`;

    await t
        .click(Selector('#awaiter'))
        .expect(renderInBrowser({...defaultOptions}, markup))
        .eql(expected);
});

test('Renders properly simple link markup with classes hive-test, external', async (t) => {
    const markup = '[Hive Link](https://hive.io)';

    await t
        .click(Selector('#awaiter'))
        .expect(renderInBrowser({...defaultOptions}, markup))
        .eql(`<p><a href="https://hive.io" class="hive-class external">Hive Link</a></p>\n`);
});
