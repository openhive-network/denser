import {expect} from 'chai';
import {LinkSanitizer} from './LinkSanitizer';

describe('LinkSanitizer', () => {
    it('should allow valid link', () => {
        const linkSanitizer = new LinkSanitizer({baseUrl: 'https://hive.blog/'});

        const sanitizedLink = linkSanitizer.sanitizeLink('https://hive.blog/@engrave', '@engrave');

        expect(sanitizedLink).to.equal('https://hive.blog/@engrave');
    });

    it('should prepend protocol link if not exists', () => {
        const linkSanitizer = new LinkSanitizer({baseUrl: 'https://hive.blog/'});

        const sanitizedLink = linkSanitizer.sanitizeLink('hive.blog/@engrave', 'engrave');

        expect(sanitizedLink).to.equal('https://hive.blog/@engrave');
    });

    it("should prevent links to different domain than it's title (pseudo local link)", () => {
        const linkSanitizer = new LinkSanitizer({baseUrl: 'https://hive.blog/'});

        const sanitizedLink = linkSanitizer.sanitizeLink('https://example.com/@engrave', 'https://hive.blog/@engrave');

        expect(sanitizedLink).to.equal(false);
    });

    // TODO: Fix phishing domain detection - see #801
    it.skip(`should prevent phishing domain`, () => {
        const linkSanitizer = new LinkSanitizer({baseUrl: 'https://hive.blog/'});

        const sanitizedLink = linkSanitizer.sanitizeLink('https://stemit.com/', 'https://stemit.com/');

        expect(sanitizedLink).to.equal(false);
    });
});
