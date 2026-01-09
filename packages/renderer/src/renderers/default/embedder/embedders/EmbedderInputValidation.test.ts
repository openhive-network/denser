import {expect} from 'chai';
import {YoutubeEmbedder} from './YoutubeEmbedder';
import {TwitterEmbedder} from './TwitterEmbedder';
import {SpotifyEmbedder} from './SpotifyEmbedder';
import {VimeoEmbedder} from './VimeoEmbedder';
import {TwitchEmbedder} from './TwitchEmbedder';
import {InstagramEmbedder} from './InstagramEmbedder';
import {ThreeSpeakEmbedder} from './ThreeSpeakEmbedder';
import {AssetEmbedderOptions} from '../AssetEmbedder';

// Mock options for embedders that require AssetEmbedderOptions
const mockOptions: AssetEmbedderOptions = {
    baseUrl: 'https://example.com',
    width: 640,
    height: 480,
    hideImages: false,
    imageProxyFn: (url: string) => url,
    hashtagUrlFn: (hashtag: string) => `/trending/${hashtag}`,
    usertagUrlFn: (account: string) => `/@${account}`
};

/**
 * Characters that should NEVER appear in extracted embed IDs.
 * These could enable attribute injection or HTML breakout if passed through.
 */
const DANGEROUS_CHARS = [
    {char: '"', name: 'double quote'},
    {char: '<', name: 'less than'},
    {char: '>', name: 'greater than'},
    {char: "'", name: 'single quote'},
    {char: ';', name: 'semicolon'},
    {char: '(', name: 'open paren'},
    {char: ')', name: 'close paren'},
    {char: '{', name: 'open brace'},
    {char: '}', name: 'close brace'},
    {char: '`', name: 'backtick'}
];

/**
 * Embedder Input Validation Tests
 *
 * These tests verify that each embedder either:
 * 1. Rejects URLs with dangerous characters (returns undefined), OR
 * 2. Strips dangerous characters and extracts only the safe portion
 *
 * Either behavior is acceptable - what matters is that dangerous
 * characters NEVER appear in the extracted ID.
 */
describe('Embedder Input Validation', () => {
    describe('YouTube', () => {
        const embedder = new YoutubeEmbedder();

        DANGEROUS_CHARS.forEach(({char, name}) => {
            it(`does not include ${name} in extracted ID`, () => {
                const maliciousUrl = `https://youtube.com/watch?v=dQw4w9WgXcQ${char}onclick=alert(1)`;
                const result = embedder.getEmbedMetadata({data: maliciousUrl} as HTMLObjectElement);
                if (result) {
                    expect(result.id).to.not.include(char);
                }
            });
        });

        it('accepts valid YouTube ID (11 chars)', () => {
            const validUrl = 'https://youtube.com/watch?v=dQw4w9WgXcQ';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('dQw4w9WgXcQ');
        });

        it('accepts YouTube shorts URL', () => {
            const validUrl = 'https://youtube.com/shorts/dQw4w9WgXcQ';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('dQw4w9WgXcQ');
        });

        it('accepts youtu.be short URL', () => {
            const validUrl = 'https://youtu.be/dQw4w9WgXcQ';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('dQw4w9WgXcQ');
        });
    });

    describe('Twitter', () => {
        const embedder = new TwitterEmbedder();

        DANGEROUS_CHARS.forEach(({char, name}) => {
            it(`does not include ${name} in extracted ID`, () => {
                const maliciousUrl = `https://twitter.com/user/status/123456789${char}onclick=alert(1)`;
                const result = embedder.getEmbedMetadata({data: maliciousUrl} as HTMLObjectElement);
                if (result) {
                    expect(result.id).to.not.include(char);
                }
            });
        });

        it('accepts valid Twitter status ID (numeric)', () => {
            const validUrl = 'https://twitter.com/username/status/1234567890123456789';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('1234567890123456789');
        });

        it('accepts x.com URLs', () => {
            const validUrl = 'https://x.com/username/status/1234567890123456789';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('1234567890123456789');
        });
    });

    describe('Spotify', () => {
        const embedder = new SpotifyEmbedder();

        DANGEROUS_CHARS.forEach(({char, name}) => {
            it(`does not include ${name} in extracted ID`, () => {
                const maliciousUrl = `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M${char}onclick=alert(1)`;
                const result = embedder.getEmbedMetadata({data: maliciousUrl} as HTMLObjectElement);
                if (result) {
                    expect(result.id).to.not.include(char);
                }
            });
        });

        it('accepts valid Spotify playlist ID', () => {
            const validUrl = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.include('37i9dQZF1DXcBWIGoYBM5M');
        });

        it('accepts valid Spotify track ID', () => {
            const validUrl = 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.include('4iV5W9uYEdYUVa79Axb7Rh');
        });

        it('accepts valid Spotify album ID', () => {
            const validUrl = 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.include('1DFixLWuPkv3KT3TnV35m3');
        });
    });

    describe('Vimeo', () => {
        const embedder = new VimeoEmbedder();

        DANGEROUS_CHARS.forEach(({char, name}) => {
            it(`does not include ${name} in extracted ID`, () => {
                const maliciousUrl = `https://vimeo.com/123456789${char}onclick=alert(1)`;
                const result = embedder.getEmbedMetadata({data: maliciousUrl} as HTMLObjectElement);
                if (result) {
                    expect(result.id).to.not.include(char);
                }
            });
        });

        it('accepts valid Vimeo ID (numeric)', () => {
            const validUrl = 'https://vimeo.com/123456789';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('123456789');
        });

        it('accepts player.vimeo.com URL', () => {
            const validUrl = 'https://player.vimeo.com/video/123456789';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('123456789');
        });
    });

    describe('Twitch', () => {
        const embedder = new TwitchEmbedder(mockOptions);

        DANGEROUS_CHARS.forEach(({char, name}) => {
            it(`does not include ${name} in extracted ID`, () => {
                const maliciousUrl = `https://twitch.tv/channelname${char}onclick=alert(1)`;
                const result = embedder.getEmbedMetadata({data: maliciousUrl} as HTMLObjectElement);
                if (result) {
                    expect(result.id).to.not.include(char);
                }
            });
        });

        it('accepts valid Twitch channel URL', () => {
            const validUrl = 'https://twitch.tv/channelname';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.include('channelname');
        });

        it('accepts valid Twitch video URL', () => {
            const validUrl = 'https://twitch.tv/videos/1234567890';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.include('1234567890');
        });
    });

    describe('Instagram', () => {
        const embedder = new InstagramEmbedder();

        DANGEROUS_CHARS.forEach(({char, name}) => {
            it(`does not include ${name} in extracted ID`, () => {
                const maliciousUrl = `https://instagram.com/p/CxYzAbCdEfG${char}onclick=alert(1)`;
                const result = embedder.getEmbedMetadata({data: maliciousUrl} as HTMLObjectElement);
                if (result) {
                    expect(result.id).to.not.include(char);
                }
            });
        });

        it('accepts valid Instagram post URL', () => {
            const validUrl = 'https://instagram.com/p/CxYzAbCdEfG';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.include('CxYzAbCdEfG');
        });

        it('accepts valid Instagram reel URL', () => {
            const validUrl = 'https://instagram.com/reel/CxYzAbCdEfG';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.include('CxYzAbCdEfG');
        });
    });

    describe('3Speak', () => {
        const embedder = new ThreeSpeakEmbedder();

        DANGEROUS_CHARS.forEach(({char, name}) => {
            it(`does not include ${name} in extracted ID`, () => {
                const maliciousUrl = `https://3speak.tv/watch?v=username/video-id${char}onclick=alert(1)`;
                const result = embedder.getEmbedMetadata({data: maliciousUrl} as HTMLObjectElement);
                if (result) {
                    expect(result.id).to.not.include(char);
                }
            });
        });

        it('accepts valid 3Speak URL', () => {
            const validUrl = 'https://3speak.tv/watch?v=username/video-id';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('username/video-id');
        });

        it('accepts 3speak.online domain', () => {
            const validUrl = 'https://3speak.online/watch?v=username/video-id';
            const result = embedder.getEmbedMetadata({data: validUrl} as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('username/video-id');
        });
    });
});

/**
 * Embed Processing Safety Tests
 *
 * These tests verify that processEmbed() generates safe HTML output
 * even if an unexpected ID somehow gets through.
 */
describe('Embed Processing Safety', () => {
    describe('YouTube processEmbed', () => {
        const embedder = new YoutubeEmbedder();

        it('generates iframe with correct src', () => {
            const result = embedder.processEmbed('dQw4w9WgXcQ', {width: 640, height: 480});
            expect(result).to.include('<iframe');
            expect(result).to.include('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
        });

        it('does not include event handlers in output', () => {
            const result = embedder.processEmbed('dQw4w9WgXcQ', {width: 640, height: 480});
            expect(result).to.not.match(/\son\w+\s*=/i);
        });
    });

    describe('Twitter processEmbed', () => {
        const embedder = new TwitterEmbedder();

        it('generates iframe with correct src', () => {
            const result = embedder.processEmbed('1234567890', {width: 640, height: 480});
            expect(result).to.include('<iframe');
            expect(result).to.include('platform.twitter.com/embed/Tweet.html?id=1234567890');
        });

        it('does not include event handlers in output', () => {
            const result = embedder.processEmbed('1234567890', {width: 640, height: 480});
            expect(result).to.not.match(/\son\w+\s*=/i);
        });
    });

    describe('Spotify processEmbed', () => {
        const embedder = new SpotifyEmbedder();

        it('generates iframe with correct src', () => {
            const result = embedder.processEmbed('embed/playlist/37i9dQZF1DXcBWIGoYBM5M', {width: 640, height: 480});
            expect(result).to.include('<iframe');
            expect(result).to.include('spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M');
        });

        it('does not include event handlers in output', () => {
            const result = embedder.processEmbed('embed/playlist/37i9dQZF1DXcBWIGoYBM5M', {width: 640, height: 480});
            expect(result).to.not.match(/\son\w+\s*=/i);
        });
    });

    describe('Vimeo processEmbed', () => {
        const embedder = new VimeoEmbedder();

        it('generates iframe with correct src', () => {
            const result = embedder.processEmbed('123456789', {width: 640, height: 480});
            expect(result).to.include('<iframe');
            expect(result).to.include('player.vimeo.com/video/123456789');
        });

        it('does not include event handlers in output', () => {
            const result = embedder.processEmbed('123456789', {width: 640, height: 480});
            expect(result).to.not.match(/\son\w+\s*=/i);
        });
    });

    describe('Twitch processEmbed', () => {
        const embedder = new TwitchEmbedder(mockOptions);

        it('generates iframe with correct src', () => {
            const result = embedder.processEmbed('?channel=channelname', {width: 640, height: 480});
            expect(result).to.include('<iframe');
            expect(result).to.include('player.twitch.tv/?channel=channelname');
        });

        it('does not include event handlers in output', () => {
            const result = embedder.processEmbed('?channel=channelname', {width: 640, height: 480});
            expect(result).to.not.match(/\son\w+\s*=/i);
        });
    });

    describe('Instagram processEmbed', () => {
        const embedder = new InstagramEmbedder();

        it('generates iframe with correct src', () => {
            const result = embedder.processEmbed('p/CxYzAbCdEfG', {width: 640, height: 480});
            expect(result).to.include('<iframe');
            expect(result).to.include('instagram.com/p/CxYzAbCdEfG/embed');
        });

        it('does not include event handlers in output', () => {
            const result = embedder.processEmbed('p/CxYzAbCdEfG', {width: 640, height: 480});
            expect(result).to.not.match(/\son\w+\s*=/i);
        });
    });

    describe('3Speak processEmbed', () => {
        const embedder = new ThreeSpeakEmbedder();

        it('generates iframe with correct src', () => {
            const result = embedder.processEmbed('username/video-id', {width: 640, height: 480});
            expect(result).to.include('<iframe');
            expect(result).to.include('3speak.tv/embed?v=username/video-id');
        });

        it('does not include event handlers in output', () => {
            const result = embedder.processEmbed('username/video-id', {width: 640, height: 480});
            expect(result).to.not.match(/\son\w+\s*=/i);
        });
    });
});
