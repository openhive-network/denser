import {expect} from 'chai';
import 'mocha';
import {extractContentMetadata} from './ContentMetadata';

describe('extractContentMetadata', () => {
    it('extracts hashtags, mentions, images and links from a markdown body', () => {
        const body = [
            'Thanks @Alice and @bob.smith, see #Photography and #hive-174695 #2024',
            '![cat](https://images.hive.blog/cat.png)',
            'Source: [the article](https://example.com/article) and https://example.org/page'
        ].join('\n\n');
        expect(extractContentMetadata(body)).to.deep.equal({
            hashtags: ['photography', 'hive-174695'],
            usertags: ['alice', 'bob.smith'],
            images: ['https://images.hive.blog/cat.png'],
            links: ['https://example.com/article', 'https://example.org/page']
        });
    });

    it('ignores mentions of invalid account names and text inside code', () => {
        const body = 'Hi @ab and `@carol #code`';
        expect(extractContentMetadata(body)).to.deep.equal({hashtags: [], usertags: [], images: [], links: []});
    });

    it('reads an <html>-wrapped body without rendering it as markdown', () => {
        const body = '<html><p><img src="https://example.com/a.jpg"/> @dave</p></html>';
        const metadata = extractContentMetadata(body);
        expect(metadata.images).to.deep.equal(['https://example.com/a.jpg']);
        expect(metadata.usertags).to.deep.equal(['dave']);
    });
});
