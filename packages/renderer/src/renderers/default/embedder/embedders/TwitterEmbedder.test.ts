import {expect} from 'chai';
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
                expect(result).to.not.be.undefined;
                expect(result?.id).to.equal('1234567890123456789');
                expect(result?.url).to.contain('/status/1234567890123456789');
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
                expect(result).to.not.be.undefined;
                expect(result?.id).to.equal('9876543210987654321');
                expect(result?.url).to.contain('/status/9876543210987654321');
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

        const urlsWithTrailingSegments = [
            {
                input: 'https://x.com/ShouldHaveCat/status/1889804218132832323/asdasd',
                expectedId: '1889804218132832323'
            },
            {
                input: 'https://x.com/username/status/1234567890123456789?s=20',
                expectedId: '1234567890123456789'
            },
            {
                input: 'https://x.com/username/status/1234567890123456789/',
                expectedId: '1234567890123456789'
            },
            {
                input: 'https://x.com/username/status/1234567890123456789/photo/1?ref=src',
                expectedId: '1234567890123456789'
            }
        ];

        urlsWithTrailingSegments.forEach(({input, expectedId}) => {
            it(`should match full URL and extract correct ID for: ${input}`, () => {
                const embedder = new TwitterEmbedder();
                const result = embedder.getEmbedMetadata({data: input} as HTMLObjectElement);
                expect(result).to.not.be.undefined;
                expect(result?.id).to.equal(expectedId);
                expect(result?.url).to.equal(input);
            });
        });

        it('should handle URL with fragment (#hash)', () => {
            const embedder = new TwitterEmbedder();
            const result = embedder.getEmbedMetadata({
                data: 'https://x.com/username/status/1234567890123456789#top'
            } as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('1234567890123456789');
            expect(result?.url).to.contain('#top');
        });

        it('should extract URL from surrounding text and stop at whitespace', () => {
            const embedder = new TwitterEmbedder();
            const result = embedder.getEmbedMetadata({
                data: 'Check this https://x.com/username/status/1234567890123456789/photo/1 nice tweet'
            } as HTMLObjectElement);
            expect(result).to.not.be.undefined;
            expect(result?.id).to.equal('1234567890123456789');
            expect(result?.url).to.not.contain('nice');
        });

        invalidUrls.forEach((url) => {
            it(`should return undefined for invalid URL: ${url}`, () => {
                const embedder = new TwitterEmbedder();
                const result = embedder.getEmbedMetadata({data: url} as HTMLObjectElement);
                expect(result).to.be.undefined;
            });
        });
    });

    describe('processEmbed', () => {
        it('should generate correct iframe HTML without width/height attributes', () => {
            const embedder = new TwitterEmbedder();
            const result = embedder.processEmbed('1234567890123456789', {width: 550, height: 400});
            expect(result).to.equal(
                '<div class="twitterWrapper"><iframe src="https://platform.twitter.com/embed/Tweet.html?id=1234567890123456789" frameborder="0" allowtransparency="true"></iframe></div>'
            );
        });

        it('should always use platform.twitter.com regardless of input domain', () => {
            const embedder = new TwitterEmbedder();
            const result = embedder.processEmbed('9876543210987654321', {width: 640, height: 480});
            expect(result).to.contain('platform.twitter.com');
            expect(result).to.not.contain('x.com');
        });

        it('should not include scrolling attribute', () => {
            const embedder = new TwitterEmbedder();
            const result = embedder.processEmbed('1234567890123456789', {width: 640, height: 480});
            expect(result).to.not.contain('scrolling');
        });
    });

    describe('type', () => {
        it('should have correct type identifier', () => {
            const embedder = new TwitterEmbedder();
            expect(embedder.type).to.equal('twitter');
        });
    });
});
