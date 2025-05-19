import {expect} from 'chai';
import {JSDOM} from 'jsdom';
import 'mocha';
import {Log} from '../../Log';
import {DefaultRenderer, RendererOptions} from './DefaultRenderer';

describe('DefaultRender', () => {
    const defaultOptions: RendererOptions = {
        baseUrl: 'https://hive.blog/',
        breaks: true,
        skipSanitization: false,
        allowInsecureScriptTags: false,
        addTargetBlankToLinks: true,
        cssClassForInternalLinks: 'hive-test',
        cssClassForExternalLinks: 'hive-test external',
        addNofollowToLinks: true,
        doNotShowImages: false,
        assetsWidth: 640,
        assetsHeight: 480,
        imageProxyFn: (url: string) => url,
        usertagUrlFn: (account: string) => `https://hive.blog/@${account}`,
        hashtagUrlFn: (hashtag: string) => `/trending/${hashtag}`,
        isLinkSafeFn: (_url: string) => true, // !!url.match(/^(\/(?!\/)|https:\/\/hive.blog)/),
        addExternalCssClassToMatchingLinksFn: (url: string) => !url.match(/^(\/(?!\/)|https:\/\/hive.blog)/),
        plugins: []
    };

    const tests = [
        {name: 'Renders H1 headers correctly', raw: `# Header H1`, expected: '<h1>Header H1</h1>'},
        {name: 'Renders H4 headers correctly', raw: `#### Header H4`, expected: '<h4>Header H4</h4>'},
        {
            name: 'Renders headers and paragraphs correctly',
            raw: '# Header H1\n\nSome paragraph\n\n## Header H2\n\nAnother paragraph',
            expected: '<h1>Header H1</h1>\n<p>Some paragraph</p>\n<h2>Header H2</h2>\n<p>Another paragraph</p>'
        },
        {
            name: 'Renders hive mentions correctly',
            raw: 'Content @noisy another content',
            expected: '<p>Content <a href="https://hive.blog/@noisy" class="hive-test">@noisy</a> another content</p>'
        },
        {
            name: 'Renders hive hashtags correctly',
            raw: 'Content #pl-nuda another content',
            expected: '<p>Content <a href="/trending/pl-nuda" class="hive-test">#pl-nuda</a> another content</p>'
        },
        {
            name: 'Allows links embedded via <a> tags',
            raw: '<a href="https://hive.blog/utopian-io/@blockchainstudio/drugswars-revenue-and-transaction-analysis" class="hive-test">Drugwars - revenue and transaction analysis</a>',
            expected:
                '<p><a href="https://hive.blog/utopian-io/@blockchainstudio/drugswars-revenue-and-transaction-analysis" class="hive-test">Drugwars - revenue and transaction analysis</a></p>'
        },
        {
            name: 'Allows links embedded via <a> tags inside of markdown headers',
            raw: "## <a href='https://hive.blog/utopian-io/@blockchainstudio/drugswars-revenue-and-transaction-analysis' class='hive-test'>Drugwars - revenue and transaction analysis</a>",
            expected:
                '<h2><a href="https://hive.blog/utopian-io/@blockchainstudio/drugswars-revenue-and-transaction-analysis" class="hive-test">Drugwars - revenue and transaction analysis</a></h2>'
        },
        {
            name: 'Allow for anchor id tags',
            raw: "<a id='anchor'></a>",
            expected: '<p><a id="anchor" class="hive-test"></a></p>'
        },
        {
            name: 'Allows links embedded via <a> tags with additional class added when condition is matching',
            raw: '<a href="https://www.google.com" class="hive-test">Google</a>',
            expected: '<p><a href="https://www.google.com" class="hive-test external">Google</a></p>'
        },
        {
            name: 'Should remove additional unsafe attributes from a tag',
            raw: "<a fake='test'></a>",
            expected: '<p><a class="hive-test"></a></p>'
        },
        {
            name: 'Spotify playlist link should be embedded correctly',
            raw: 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk',
            expected:
                '<p><div class="videoWrapper"><iframe src="https://open.spotify.com/embed/playlist/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div></p>'
        },
        {
            name: 'Spotify track link should be embedded correctly',
            raw: 'https://open.spotify.com/track/3Qm86XLflmIXVm1wcwkgDK',
            expected:
                '<p><div class="videoWrapper"><iframe src="https://open.spotify.com/embed/track/3Qm86XLflmIXVm1wcwkgDK" width="640" height="480" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div></p>'
        },
        {
            name: 'Spotify album link should be embedded correctly',
            raw: 'https://open.spotify.com/album/1zLvUhumbFIEdfxYQcgUxk',
            expected:
                '<p><div class="videoWrapper"><iframe src="https://open.spotify.com/embed/album/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div></p>'
        },
        {
            name: 'Spotify episode link should be embedded correctly',
            raw: 'https://open.spotify.com/episode/1zLvUhumbFIEdfxYQcgUxk',
            expected:
                '<p><div class="videoWrapper"><iframe src="https://open.spotify.com/embed-podcast/episode/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div></p>'
        },
        {
            name: 'Spotify show link should be embedded correctly',
            raw: 'https://open.spotify.com/show/1zLvUhumbFIEdfxYQcgUxk',
            expected:
                '<p><div class="videoWrapper"><iframe src="https://open.spotify.com/embed-podcast/show/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div></p>'
        },
        {
            name: 'Spotify artist link should be embedded correctly',
            raw: 'https://open.spotify.com/artist/1zLvUhumbFIEdfxYQcgUxk',
            expected:
                '<p><div class="videoWrapper"><iframe src="https://open.spotify.com/embed/artist/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div></p>'
        },
        {
            name: 'Spotify embed playlist via iframe should be embedded correctly',
            raw: '<iframe src="https://open.spotify.com/embed/playlist/1zLvUhumbFIEdfxYQcgUxk" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>',
            expected:
                '<div class="videoWrapper"><iframe src="https://open.spotify.com/embed/playlist/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen"></iframe></div>'
        },
        {
            name: 'Spotify embed track via iframe should be embedded correctly',
            raw: '<iframe src="https://open.spotify.com/embed/track/3Qm86XLflmIXVm1wcwkgDK" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>',
            expected:
                '<div class="videoWrapper"><iframe src="https://open.spotify.com/embed/track/3Qm86XLflmIXVm1wcwkgDK" width="640" height="480" frameborder="0" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen"></iframe></div>'
        },
        {
            name: 'Spotify embed album via iframe should be embedded correctly',
            raw: '<iframe src="https://open.spotify.com/embed/album/1zLvUhumbFIEdfxYQcgUxk" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>',
            expected:
                '<div class="videoWrapper"><iframe src="https://open.spotify.com/embed/album/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen"></iframe></div>'
        },
        {
            name: 'Spotify embed episode via iframe should be embedded correctly',
            raw: '<iframe src="https://open.spotify.com/embed-podcast/episode/1zLvUhumbFIEdfxYQcgUxk" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>',
            expected:
                '<div class="videoWrapper"><iframe src="https://open.spotify.com/embed-podcast/episode/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen"></iframe></div>'
        },
        {
            name: 'Spotify embed show via iframe should be embedded correctly',
            raw: '<iframe src="https://open.spotify.com/embed-podcast/show/1zLvUhumbFIEdfxYQcgUxk" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>',
            expected:
                '<div class="videoWrapper"><iframe src="https://open.spotify.com/embed-podcast/show/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen"></iframe></div>'
        },
        {
            name: 'Spotify embed artist via iframe should be embedded correctly',
            raw: '<iframe src="https://open.spotify.com/embed/artist/1zLvUhumbFIEdfxYQcgUxk" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>',
            expected:
                '<div class="videoWrapper"><iframe src="https://open.spotify.com/embed/artist/1zLvUhumbFIEdfxYQcgUxk" width="640" height="480" frameborder="0" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen"></iframe></div>'
        },
        {
            name: 'Youtube link with www should be embedded correctly',
            raw: 'https://www.youtube.com/watch?v=0nFkmd-A7jA',
            expected:
                '<p><div class="videoWrapper"><iframe width="640" height="480" src="https://www.youtube.com/embed/0nFkmd-A7jA" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen" frameborder="0"></iframe></div></p>'
        },
        {
            name: 'Youtube link without www should be embedded correctly',
            raw: 'https://youtube.com/watch?v=0nFkmd-A7jA',
            expected:
                '<p><div class="videoWrapper"><iframe width="640" height="480" src="https://www.youtube.com/embed/0nFkmd-A7jA" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen" frameborder="0"></iframe></div></p>'
        },
        {
            name: 'Youtube link with embed should be embedded correctly',
            raw: 'https://www.youtube.com/embed/0nFkmd-A7jA',
            expected:
                '<p><div class="videoWrapper"><iframe width="640" height="480" src="https://www.youtube.com/embed/0nFkmd-A7jA" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen" frameborder="0"></iframe></div></p>'
        },
        {
            name: 'Youtube shorted link with watch should be embedded correctly',
            raw: 'https://youtu.be/watch?v=0nFkmd-A7jA',
            expected:
                '<p><div class="videoWrapper"><iframe width="640" height="480" src="https://www.youtube.com/embed/0nFkmd-A7jA" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen" frameborder="0"></iframe></div></p>'
        },
        {
            name: 'Youtube shorted link should be embedded correctly',
            raw: 'https://youtu.be/0nFkmd-A7jA',
            expected:
                '<p><div class="videoWrapper"><iframe width="640" height="480" src="https://www.youtube.com/embed/0nFkmd-A7jA" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen" frameborder="0"></iframe></div></p>'
        },
        {
            name: 'Youtube embed via iframe should be embedded correctly',
            raw: '<iframe width="560" height="315" src="https://www.youtube.com/embed/0nFkmd-A7jA" frameborder="0" allowfullscreen></iframe>',
            expected:
                '<div class="videoWrapper"><iframe width="640" height="480" src="https://www.youtube.com/embed/0nFkmd-A7jA" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen" frameborder="0"></iframe></div>'
        },
        {
            name: 'Vimeo link via iframe should be embedded correctly',
            raw: '<iframe src="https://player.vimeo.com/video/174544848?byline=0" width="640" height="360" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>',
            expected:
                '<div class="videoWrapper"><iframe frameborder="0" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen" src="https://player.vimeo.com/video/174544848" width="640" height="480"></iframe></div>'
        },
        {
            name: 'Vimeo link should be embedded correctly',
            raw: 'https://vimeo.com/174544848',
            expected:
                '<p><div class="videoWrapper"><iframe src="https://player.vimeo.com/video/174544848" width="640" height="480" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div></p>'
        },
        {
            name: 'Vimeo link without player should be embedded correctly',
            raw: 'https://vimeo.com/174544848',
            expected:
                '<p><div class="videoWrapper"><iframe src="https://player.vimeo.com/video/174544848" width="640" height="480" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe></div></p>'
        }
    ];

    tests.forEach((test) =>
        it(test.name, () => {
            const renderer = new DefaultRenderer(defaultOptions);
            const rendered = renderer.render(test.raw).trim();

            const renderedNode = JSDOM.fragment(rendered);
            const comparisonNode = JSDOM.fragment(test.expected);

            Log.log().debug('rendered', rendered);
            Log.log().debug('expected', test.expected);

            expect(renderedNode.isEqualNode(comparisonNode)).to.be.equal(true);
        })
    );

    it('Allows insecure script tags when allowInsecureScriptTags = true', () => {
        const renderer = new DefaultRenderer({...defaultOptions, allowInsecureScriptTags: true});
        const insecureContent = '<script src="">';
        renderer.render(insecureContent);
    });

    it('Does not allow insecure script tags when allowInsecureScriptTags = false', () => {
        const renderer = new DefaultRenderer({
            ...defaultOptions,
            skipSanitization: true,
            allowInsecureScriptTags: false
        });
        const insecureContent = '<script src="">';
        expect(() => renderer.render(insecureContent)).to.throw(/insecure content/);
    });

    it('Rejects mixed image tag', () => {
        const renderer = new DefaultRenderer({...defaultOptions});
        const markup = `<img src="![img.jpg](https://img.jpg)"/>`;
        const rendered = renderer.render(markup);

        const expected = `<p><img src="brokenimg.jpg" /></p>\n`;
        expect(rendered).to.be.equal(expected);
    });

    it('Should convert new lines to <br /> tags if breaks options is set to true for markdown input', () => {
        const renderer = new DefaultRenderer({...defaultOptions, breaks: true});
        const rendered = renderer.render(`test\ntest`).trim();
        expect(rendered).to.be.equal('<p>test<br />\ntest</p>');
    });

    it('Should not convert new lines to <br> tags if breaks options is set to false for markdown input', () => {
        const renderer = new DefaultRenderer({...defaultOptions, breaks: false});
        const rendered = renderer.render(`test\ntest`).trim();
        expect(rendered).to.be.equal('<p>test\ntest</p>');
    });

    it('Should not convert new lines to <br> tags if breaks options is set to true for html input', () => {
        const renderer = new DefaultRenderer({...defaultOptions, breaks: true});
        const rendered = renderer.render(`<p>test\ntest</p>`).trim();
        expect(rendered).to.be.equal('<p>test\ntest</p>');
    });

    it('Should add <pre> tag to hide images if doNotShowImages option is set to true', () => {
        const renderer = new DefaultRenderer({...defaultOptions, doNotShowImages: true});
        const rendered = renderer.render(`![img.jpg](https://img.jpg)`).trim();
        expect(rendered).to.be.equal('<p></p><pre>https://img.jpg</pre><p></p>');
    });

    it('Should add <pre> tag to hide images if doNotShowImages option is set to true for html input', () => {
        const renderer = new DefaultRenderer({...defaultOptions, doNotShowImages: true});
        const rendered = renderer.render(`<img src="https://img.jpg" />`).trim();
        expect(rendered).to.be.equal('<p></p><pre>https://img.jpg</pre><p></p>');
    });

    [
        '/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE',
        '//ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE',
        `ipfs://QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE`
    ].forEach((ipfsLink) => {
        it(`Should prefix ifps link (${ipfsLink}) with ipfsPrefix`, () => {
            const renderer = new DefaultRenderer({...defaultOptions, ipfsPrefix: 'https://gateway.io/ipfs'});
            const rendered = renderer.render(`![img.jpg](${ipfsLink})`).trim();
            expect(rendered).to.be.equal('<p><img src="https://gateway.io/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE" alt="img.jpg" /></p>');
        });
    });

    it('should prefix ipfs links with ipfsPrefix regardless if the prefix contains a trailing slash or not', () => {
        const renderer1 = new DefaultRenderer({...defaultOptions, ipfsPrefix: 'https://gateway.io/ipfs'});
        const renderer2 = new DefaultRenderer({...defaultOptions, ipfsPrefix: 'https://gateway.io/ipfs/'});
        const rendered1 = renderer1.render(`![img.jpg](ipfs://QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE)`).trim();
        const rendered2 = renderer2.render(`![img.jpg](ipfs://QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE)`).trim();
        expect(rendered1).to.be.equal('<p><img src="https://gateway.io/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE" alt="img.jpg" /></p>');
        expect(rendered2).to.be.equal('<p><img src="https://gateway.io/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE" alt="img.jpg" /></p>');
    });

    it('Renders spoiler tags correctly', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        const raw = '>! [Click to reveal] Hidden content\n> More hidden text';
        const rendered = renderer.render(raw).trim();

        // Normalize both strings by removing extra whitespace
        const normalizeHtml = (html: string) => {
            return html.replace(/\s+/g, ' ').trim();
        };

        const expected = '<p></p><details><summary>Click to reveal</summary><p>Hidden content More hidden text</p></details><p></p>';

        expect(normalizeHtml(rendered)).to.equal(normalizeHtml(expected));
    });

    it('Renders spoiler tags correctly with no title provided with fallback title', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        const raw = '>! [] Hidden content\n> More hidden text';
        const rendered = renderer.render(raw).trim();

        // Normalize both strings by removing extra whitespace
        const normalizeHtml = (html: string) => {
            return html.replace(/\s+/g, ' ').trim();
        };

        const expected = '<p></p><details><summary>Reveal spoiler</summary><p>Hidden content More hidden text</p></details><p></p>';

        expect(normalizeHtml(rendered)).to.equal(normalizeHtml(expected));
    });
});
