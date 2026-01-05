import {TwitterEmbedder} from './TwitterEmbedder';

describe('TwitterEmbedder', () => {
    describe('getEmbedMetadata', () => {
        const validTwitterUrls = [
            'https://twitter.com/username/status/1234567890123456789',
            'https://www.twitter.com/username/status/1234567890123456789',
            'https://twitter.com/user_name/status/1234567890123456789',
            'http://twitter.com/username/status/1234567890123456789'
        ];

        validTwitterUrls.forEach((url) => {
            it(`should return correct metadata for Twitter URL: ${url}`, () => {
                const embedder = new TwitterEmbedder();
                const result = embedder.getEmbedMetadata({data: url} as HTMLObjectElement);
                expect(result).toBeDefined();
                expect(result?.id).toBe('1234567890123456789');
                expect(result?.url).toContain('/status/1234567890123456789');
            });
        });

        const validXUrls = [
            'https://x.com/username/status/9876543210987654321',
            'https://www.x.com/username/status/9876543210987654321',
            'https://x.com/user_name/status/9876543210987654321',
            'http://x.com/username/status/9876543210987654321'
        ];

        validXUrls.forEach((url) => {
            it(`should return correct metadata for X.com URL: ${url}`, () => {
                const embedder = new TwitterEmbedder();
                const result = embedder.getEmbedMetadata({data: url} as HTMLObjectElement);
                expect(result).toBeDefined();
                expect(result?.id).toBe('9876543210987654321');
                expect(result?.url).toContain('/status/9876543210987654321');
            });
        });

        const invalidUrls = [
            'https://twitter.com/',
            'https://twitter.com/username',
            'https://twitter.com/username/status/',
            'https://twitter.com/username/status/abc',
            'https://facebook.com/user/status/1234567890',
            'https://twitter.com/i/events/1234567890',
            'not a url'
        ];

        invalidUrls.forEach((url) => {
            it(`should return undefined for invalid URL: ${url}`, () => {
                const embedder = new TwitterEmbedder();
                const result = embedder.getEmbedMetadata({data: url} as HTMLObjectElement);
                expect(result).toBeUndefined();
            });
        });
    });

    describe('processEmbed', () => {
        it('should generate correct iframe HTML', () => {
            const embedder = new TwitterEmbedder();
            const result = embedder.processEmbed('1234567890123456789', {width: 550, height: 400});
            expect(result).toBe(
                '<div class="twitterWrapper"><iframe width="550" height="400" src="https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789" frameborder="0" scrolling="no" allowtransparency="true"></iframe></div>'
            );
        });

        it('should always use platform.twitter.com regardless of input domain', () => {
            const embedder = new TwitterEmbedder();
            // Even if the original URL was x.com, the embed uses platform.twitter.com
            const result = embedder.processEmbed('9876543210987654321', {width: 640, height: 480});
            expect(result).toContain('platform.twitter.com');
            expect(result).not.toContain('x.com');
        });
    });

    describe('type', () => {
        it('should have correct type identifier', () => {
            const embedder = new TwitterEmbedder();
            expect(embedder.type).toBe('twitter');
        });
    });
});
