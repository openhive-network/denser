import {InstagramEmbedder} from './InstagramEmbedder';

describe('InstagramEmbedder', () => {
    describe('getEmbedMetadata', () => {
        const validPostUrls = [
            'https://www.instagram.com/p/ABC123defgh/',
            'https://instagram.com/p/ABC123defgh/',
            'https://www.instagram.com/p/ABC123defgh',
            'https://instagram.com/p/ABC123defgh'
        ];

        validPostUrls.forEach((url) => {
            it(`should return correct metadata for Instagram post URL: ${url}`, () => {
                const embedder = new InstagramEmbedder();
                const result = embedder.getEmbedMetadata({data: url} as HTMLObjectElement);
                expect(result).toBeDefined();
                expect(result?.id).toBe('p/ABC123defgh');
                expect(result?.url).toContain('instagram.com/p/ABC123defgh');
            });
        });

        const validReelUrls = [
            'https://www.instagram.com/reel/XYZ789abcde/',
            'https://instagram.com/reel/XYZ789abcde/',
            'https://www.instagram.com/reel/XYZ789abcde',
            'https://instagram.com/reel/XYZ789abcde'
        ];

        validReelUrls.forEach((url) => {
            it(`should return correct metadata for Instagram reel URL: ${url}`, () => {
                const embedder = new InstagramEmbedder();
                const result = embedder.getEmbedMetadata({data: url} as HTMLObjectElement);
                expect(result).toBeDefined();
                expect(result?.id).toBe('reel/XYZ789abcde');
                expect(result?.url).toContain('instagram.com/reel/XYZ789abcde');
            });
        });

        const invalidUrls = [
            'https://www.instagram.com/',
            'https://www.instagram.com/username/',
            'https://www.instagram.com/p/',
            'https://www.instagram.com/p/short',
            'https://www.instagram.com/stories/username/',
            'https://facebook.com/p/ABC123defgh/',
            'not a url'
        ];

        invalidUrls.forEach((url) => {
            it(`should return undefined for invalid URL: ${url}`, () => {
                const embedder = new InstagramEmbedder();
                const result = embedder.getEmbedMetadata({data: url} as HTMLObjectElement);
                expect(result).toBeUndefined();
            });
        });
    });

    describe('processEmbed', () => {
        it('should generate correct iframe HTML for post', () => {
            const embedder = new InstagramEmbedder();
            const result = embedder.processEmbed('p/ABC123defgh', {width: 640, height: 480});
            expect(result).toBe(
                '<div class="instagramWrapper"><iframe width="640" height="480" src="https://www.instagram.com/p/ABC123defgh/embed/" frameborder="0" scrolling="no" allowtransparency="true"></iframe></div>'
            );
        });

        it('should generate correct iframe HTML for reel', () => {
            const embedder = new InstagramEmbedder();
            const result = embedder.processEmbed('reel/XYZ789abcde', {width: 500, height: 600});
            expect(result).toBe(
                '<div class="instagramWrapper"><iframe width="500" height="600" src="https://www.instagram.com/reel/XYZ789abcde/embed/" frameborder="0" scrolling="no" allowtransparency="true"></iframe></div>'
            );
        });
    });

    describe('type', () => {
        it('should have correct type identifier', () => {
            const embedder = new InstagramEmbedder();
            expect(embedder.type).toBe('instagram');
        });
    });
});
