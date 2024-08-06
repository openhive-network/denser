import {expect} from 'chai';
import {TwitterEmbedder} from './TwitterEmbedder';

describe('TwitterEmbedder', () => {
    let embedder: TwitterEmbedder;

    beforeEach(() => {
        embedder = new TwitterEmbedder();
    });

    describe('getXMetadataFromLink', () => {
        it('should extract metadata from a valid Twitter link', () => {
            const link = 'https://twitter.com/username/status/1234567890';
            const metadata = embedder.getEmbedMetadata(link);

            expect(metadata).to.not.be.undefined;
            expect(metadata?.id).to.equal('1234567890');
            expect(metadata?.url).to.equal(link);
        });

        it('should extract metadata from a valid X link', () => {
            const link = 'https://x.com/username/status/1234567890';
            const metadata = embedder.getEmbedMetadata(link);

            expect(metadata).to.not.be.undefined;
            expect(metadata?.id).to.equal('1234567890');
            expect(metadata?.url).to.equal(link);
        });

        it('should return undefined for an invalid link', () => {
            const link = 'https://example.com/not-a-tweet';
            const metadata = embedder.getEmbedMetadata(link);

            expect(metadata).to.be.undefined;
        });

        it('should return undefined for an empty string', () => {
            const metadata = embedder.getEmbedMetadata('');

            expect(metadata).to.be.undefined;
        });
    });

    describe('getEmbedMetadata', () => {
        it('should return embed metadata for a valid Twitter object', () => {
            const mockObject = {
                data: 'https://twitter.com/username/status/1234567890'
            } as HTMLObjectElement;

            const metadata = embedder.getEmbedMetadata(mockObject);

            expect(metadata).to.not.be.undefined;
            expect(metadata?.id).to.equal('1234567890');
            expect(metadata?.url).to.equal('https://twitter.com/username/status/1234567890');
        });

        it('should return undefined for an invalid object', () => {
            const mockObject = {
                data: 'https://example.com/not-a-tweet'
            } as HTMLObjectElement;

            const metadata = embedder.getEmbedMetadata(mockObject);

            expect(metadata).to.be.undefined;
        });
    });

    describe('processEmbed', () => {
        it('should generate correct iframe HTML', () => {
            const id = '1234567890';
            const size = {width: 500, height: 300};

            const result = embedder.processEmbed(id, size);

            expect(result).to.equal(
                '<div class="twitterWrapper"><iframe width="500" height="300" src="https://platform.twitter.com/embed/Tweet.html?id=1234567890" frameborder="0" scrolling="no" allowtransparency="true" allowfullscreen="true"></iframe></div>'
            );
        });
    });
});
