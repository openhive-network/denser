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
                '<p><div class="videoWrapper"><div class="youtube-facade" data-youtube-id="0nFkmd-A7jA" data-width="640" data-height="480"><img src="https://img.youtube.com/vi/0nFkmd-A7jA/hqdefault.jpg" alt="YouTube video thumbnail" loading="eager" /><button class="youtube-play-btn" aria-label="Play video"><svg viewBox="0 0 68 48" width="68" height="48"><path class="youtube-play-bg" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/><path d="M45 24 27 14v20" fill="#fff"/></svg></button></div></div></p>'
        },
        {
            name: 'Youtube link without www should be embedded correctly',
            raw: 'https://youtube.com/watch?v=0nFkmd-A7jA',
            expected:
                '<p><div class="videoWrapper"><div class="youtube-facade" data-youtube-id="0nFkmd-A7jA" data-width="640" data-height="480"><img src="https://img.youtube.com/vi/0nFkmd-A7jA/hqdefault.jpg" alt="YouTube video thumbnail" loading="eager" /><button class="youtube-play-btn" aria-label="Play video"><svg viewBox="0 0 68 48" width="68" height="48"><path class="youtube-play-bg" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/><path d="M45 24 27 14v20" fill="#fff"/></svg></button></div></div></p>'
        },
        {
            name: 'Youtube link with embed should be embedded correctly',
            raw: 'https://www.youtube.com/embed/0nFkmd-A7jA',
            expected:
                '<p><div class="videoWrapper"><div class="youtube-facade" data-youtube-id="0nFkmd-A7jA" data-width="640" data-height="480"><img src="https://img.youtube.com/vi/0nFkmd-A7jA/hqdefault.jpg" alt="YouTube video thumbnail" loading="eager" /><button class="youtube-play-btn" aria-label="Play video"><svg viewBox="0 0 68 48" width="68" height="48"><path class="youtube-play-bg" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/><path d="M45 24 27 14v20" fill="#fff"/></svg></button></div></div></p>'
        },
        {
            name: 'Youtube shorted link with watch should be embedded correctly',
            raw: 'https://youtu.be/watch?v=0nFkmd-A7jA',
            expected:
                '<p><div class="videoWrapper"><div class="youtube-facade" data-youtube-id="0nFkmd-A7jA" data-width="640" data-height="480"><img src="https://img.youtube.com/vi/0nFkmd-A7jA/hqdefault.jpg" alt="YouTube video thumbnail" loading="eager" /><button class="youtube-play-btn" aria-label="Play video"><svg viewBox="0 0 68 48" width="68" height="48"><path class="youtube-play-bg" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/><path d="M45 24 27 14v20" fill="#fff"/></svg></button></div></div></p>',
            skip: true // TODO: Fix YouTube shortened link parsing - see #801
        },
        {
            name: 'Youtube shorted link should be embedded correctly',
            raw: 'https://youtu.be/0nFkmd-A7jA',
            expected:
                '<p><div class="videoWrapper"><div class="youtube-facade" data-youtube-id="0nFkmd-A7jA" data-width="640" data-height="480"><img src="https://img.youtube.com/vi/0nFkmd-A7jA/hqdefault.jpg" alt="YouTube video thumbnail" loading="eager" /><button class="youtube-play-btn" aria-label="Play video"><svg viewBox="0 0 68 48" width="68" height="48"><path class="youtube-play-bg" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/><path d="M45 24 27 14v20" fill="#fff"/></svg></button></div></div></p>'
        },
        {
            name: 'Youtube embed via iframe should be embedded correctly',
            raw: '<iframe width="560" height="315" src="https://www.youtube.com/embed/0nFkmd-A7jA" frameborder="0" allowfullscreen></iframe>',
            expected:
                '<div class="videoWrapper"><iframe src="https://www.youtube.com/embed/0nFkmd-A7jA" width="640" height="480" frameborder="0" allowfullscreen="allowfullscreen" webkitallowfullscreen="webkitallowfullscreen" mozallowfullscreen="mozallowfullscreen"></iframe></div>'
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

    tests.forEach((test) => {
        const testFn = test.skip ? it.skip : it;
        testFn(test.name, () => {
            const renderer = new DefaultRenderer(defaultOptions);
            const rendered = renderer.render(test.raw).trim();

            const renderedNode = JSDOM.fragment(rendered);
            const comparisonNode = JSDOM.fragment(test.expected);

            Log.log().debug('rendered', rendered);
            Log.log().debug('expected', test.expected);

            expect(renderedNode.isEqualNode(comparisonNode)).to.be.equal(true);
        });
    });

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
            expect(rendered).to.be.equal('<p><img src="https://gateway.io/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE" alt="img.jpg" loading="lazy" decoding="async" /></p>');
        });
    });

    it('should prefix ipfs links with ipfsPrefix regardless if the prefix contains a trailing slash or not', () => {
        const renderer1 = new DefaultRenderer({...defaultOptions, ipfsPrefix: 'https://gateway.io/ipfs'});
        const renderer2 = new DefaultRenderer({...defaultOptions, ipfsPrefix: 'https://gateway.io/ipfs/'});
        const rendered1 = renderer1.render(`![img.jpg](ipfs://QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE)`).trim();
        const rendered2 = renderer2.render(`![img.jpg](ipfs://QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE)`).trim();
        expect(rendered1).to.be.equal('<p><img src="https://gateway.io/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE" alt="img.jpg" loading="lazy" decoding="async" /></p>');
        expect(rendered2).to.be.equal('<p><img src="https://gateway.io/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE" alt="img.jpg" loading="lazy" decoding="async" /></p>');
    });

    it('should wrap adjacent pull-left and pull-right divs in pull-columns container', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        const raw = '<div class="pull-left"><p>Left</p></div>\n<div class="pull-right"><p>Right</p></div>';
        const rendered = renderer.render(raw).trim();
        expect(rendered).to.include('pull-columns');
        expect(rendered).to.include('pull-left');
        expect(rendered).to.include('pull-right');
    });

    it('should handle pull-left/pull-right with text-justify wrappers', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        const raw = '<div class="text-justify">\n<div class="pull-left"><p>English</p></div>\n\n<div class="text-justify">\n<div class="pull-right"><p>Spanish</p></div>';
        const rendered = renderer.render(raw).trim();
        expect(rendered).to.include('pull-columns');
        expect(rendered).to.include('English');
        expect(rendered).to.include('Spanish');
    });

    it('should fix unquoted div class attributes and handle pull columns', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        const raw = '<div class=text-justify>\n<div class="pull-left"><p>Left</p></div>\n\n<div class=text-justify>\n<div class="pull-right"><p>Right</p></div>';
        const rendered = renderer.render(raw).trim();
        expect(rendered).to.include('pull-columns');
    });

    it('should not wrap a single pull-left div in pull-columns', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        const raw = '<div class="pull-left"><p>Floated content</p></div>\n\nSome other text';
        const rendered = renderer.render(raw).trim();
        expect(rendered).to.not.include('pull-columns');
        expect(rendered).to.include('pull-left');
    });

    it('should not wrap pull-left and pull-right separated by other content', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        const raw = '<div class="pull-left"><p>Left</p></div>\n\n<p>Separator paragraph</p>\n\n<div class="pull-right"><p>Right</p></div>';
        const rendered = renderer.render(raw).trim();
        expect(rendered).to.not.include('pull-columns');
    });

    it('should handle reverse order pull-right then pull-left', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        const raw = '<div class="pull-right"><p>Right</p></div>\n<div class="pull-left"><p>Left</p></div>';
        const rendered = renderer.render(raw).trim();
        expect(rendered).to.include('pull-columns');
    });

    it('should handle bilingual post with bold center headers in pull columns', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        // Real-world pattern from bilingual Hive posts: unquoted attributes,
        // text-justify wrappers, **<center>Title</center>** markdown headers
        const raw =
            '<div class=text-justify>\n<div class="pull-left">\n\n**<center>INGLÉS</center>**\n\nHello fellow travelers.\n\n</div>\n\n<div class=text-justify>\n<div class="pull-right">\n\n**<center>ESPAÑOL</center>**\n\nHola amigos viajeros.\n</div>';
        const rendered = renderer.render(raw).trim();
        expect(rendered).to.include('pull-columns');
        // pull-right must NOT be nested inside pull-left — they must be siblings
        const pullLeftIdx = rendered.indexOf('pull-left');
        const pullRightIdx = rendered.indexOf('pull-right');
        const closeDivAfterLeft = rendered.indexOf('</div>', rendered.indexOf('>', pullLeftIdx) + 1);
        // pull-right should appear after pull-left's closing div
        expect(pullRightIdx).to.be.greaterThan(closeDivAfterLeft);
        expect(rendered).to.include('INGLÉS');
        expect(rendered).to.include('ESPAÑOL');
    });

    it('should handle nested text-justify inside pull-right (real-world bilingual post)', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        // Real-world pattern: text-justify wraps everything, pull-right has nested text-justify
        // This is the exact structure from @josehany/the-waiting-is-over post
        const raw = `<div class="text-justify">
<div class="pull-left">

My day today was strange because it seemed like it was going to start badly.

</div>

<div class="pull-right">
<div class="text-justify">

Mi día de hoy fue extraño porque fue como que quiso comenzar mal.


</div></div>

<hr>`;
        const rendered = renderer.render(raw).trim();

        // Should have pull-columns wrapper
        expect(rendered).to.include('pull-columns');

        // Both columns should have their content
        expect(rendered).to.include('My day today was strange');
        expect(rendered).to.include('Mi día de hoy fue extraño');

        // The nested text-justify should be preserved inside pull-right
        expect(rendered).to.include('<div class="text-justify">');

        // Verify proper structure: pull-left and pull-right should be siblings inside pull-columns
        const pullColumnsStart = rendered.indexOf('pull-columns');
        const pullLeftStart = rendered.indexOf('pull-left', pullColumnsStart);
        const pullRightStart = rendered.indexOf('pull-right', pullColumnsStart);

        expect(pullLeftStart).to.be.greaterThan(pullColumnsStart);
        expect(pullRightStart).to.be.greaterThan(pullLeftStart);

        // Verify HTML is balanced - count div opens and closes
        const divOpens = (rendered.match(/<div/g) || []).length;
        const divCloses = (rendered.match(/<\/div>/g) || []).length;
        expect(divOpens).to.equal(divCloses);
    });

    it('should preserve nested divs content in pull columns', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        // Test with multiple nested divs
        const raw = `<div class="pull-left"><div class="inner"><p>Left inner</p></div></div>
<div class="pull-right"><div class="nested"><div class="deep"><p>Right deep</p></div></div></div>`;
        const rendered = renderer.render(raw).trim();

        expect(rendered).to.include('pull-columns');
        expect(rendered).to.include('Left inner');
        expect(rendered).to.include('Right deep');

        // Verify HTML is balanced
        const divOpens = (rendered.match(/<div/g) || []).length;
        const divCloses = (rendered.match(/<\/div>/g) || []).length;
        expect(divOpens).to.equal(divCloses);
    });

    it('should close unclosed inline tags in pull columns so table is not nested inside parent divs', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        // Pattern from bilingual posts: <i> wraps pull-right content but </i> is outside the div.
        // Without the fix, xmldom drops the pull-columns closing tags because <i> straddles the boundary,
        // causing the table to be nested inside the parent text-justify div.
        const raw = `<div class="text-justify">

<div class="pull-left">
<div class="text-justify">

Left content.

</div>

</div><div class="pull-right"><i>
<div class="text-justify">

Right content.

</div>
</div>
</i>
</div>

</div>

|**Resources**|
|-|
|[Link1](https://example.com)|`;
        const rendered = renderer.render(raw).trim();

        // Table should be outside all divs (depth 0)
        const beforeTable = rendered.substring(0, rendered.indexOf('<table'));
        let depth = 0;
        const divRegex = /<div[\s>]|<\/div>/g;
        let m;
        while ((m = divRegex.exec(beforeTable)) !== null) {
            depth += m[0].startsWith('</') ? -1 : 1;
        }
        expect(depth).to.equal(0, 'table should be at div depth 0, not nested inside parent divs');

        // HTML should be balanced overall
        const divOpens = (rendered.match(/<div[\s>]/g) || []).length;
        const divCloses = (rendered.match(/<\/div>/g) || []).length;
        expect(divOpens).to.equal(divCloses, 'HTML divs should be balanced');

        // Content should be preserved
        expect(rendered).to.include('pull-columns');
        expect(rendered).to.include('Left content');
        expect(rendered).to.include('Right content');
        expect(rendered).to.include('<table>');
    });

    it('should handle multiple pull-column pairs inside text-center wrappers with italic', () => {
        const renderer = new DefaultRenderer(defaultOptions);
        // Multiple sections with text-center > pull-left/pull-right pairs, as in bilingual review posts
        const raw = `<div class="text-justify">

<div class="text-center">

<div class="pull-left">
<div class="text-justify">

Section 1 left.

</div>
</div><div class="pull-right"><i>
<div class="text-justify">

Section 1 right.

</div>
</div>
</i>
</div>

<div class="text-center">

<div class="pull-left">
<div class="text-justify">

Section 2 left.

</div>
</div><div class="pull-right"><i>
<div class="text-justify">

Section 2 right.

</div>
</div>
</i>
</div>

</div>
</div>
</div>

|**Table**|
|-|
|Row 1|`;
        const rendered = renderer.render(raw).trim();

        // Table should be outside all divs
        const beforeTable = rendered.substring(0, rendered.indexOf('<table'));
        let depth = 0;
        const divRegex = /<div[\s>]|<\/div>/g;
        let m;
        while ((m = divRegex.exec(beforeTable)) !== null) {
            depth += m[0].startsWith('</') ? -1 : 1;
        }
        expect(depth).to.equal(0, 'table should be at div depth 0');

        // Both sections should have pull-columns
        const pullColumnsCount = (rendered.match(/pull-columns/g) || []).length;
        expect(pullColumnsCount).to.be.greaterThanOrEqual(2, 'should have at least 2 pull-columns wrappers');

        // Content preserved
        expect(rendered).to.include('Section 1 left');
        expect(rendered).to.include('Section 1 right');
        expect(rendered).to.include('Section 2 left');
        expect(rendered).to.include('Section 2 right');
    });

    // TODO: Fix spoiler tag rendering - see #801
    it.skip('Renders spoiler tags correctly', () => {
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

    // TODO: Fix spoiler tag rendering - see #801
    it.skip('Renders spoiler tags correctly with no title provided with fallback title', () => {
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
